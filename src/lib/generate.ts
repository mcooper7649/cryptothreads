import { prisma } from "@/lib/db";
import { resolveLogo, fetchLogoFromSources } from "@/lib/logo/resolve";
import { renderPrintFile } from "@/lib/design/render";
import { putAsset, readAsset } from "@/lib/storage";
import { getBlank, BlankType } from "@/lib/printful/blanks";
import { uploadFile } from "@/lib/printful/files";
import { generateMockups } from "@/lib/printful/mockups";
import { getCatalogVariants, getVariantBasePrice } from "@/lib/printful/catalog";
import type { DesignMode, Product } from "@prisma/client";

const MOCKUP_VARIANT_CAP = parseInt(process.env.PF_MOCKUP_VARIANT_CAP || "4", 10);

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Derive a display ticker/name from a query when no logo metadata exists. */
function fallbackIdentity(query: string) {
  const t = query.replace(/^https?:\/\//, "").split(/[./]/)[0];
  return { ticker: t.toUpperCase().slice(0, 8), name: undefined as string | undefined };
}

export interface PreviewResult {
  ticker: string;
  name: string | null;
  accent: string;
  found: boolean;
  source: string | null;
  previewDataUri: string;
}

/**
 * DB-free live preview: waterfall (no cache write) -> render preview PNG.
 * Powers the storefront /generate page.
 */
export async function previewDesign(
  query: string,
  mode: DesignMode = "STYLIZED"
): Promise<PreviewResult> {
  const src = await fetchLogoFromSources(query);
  const fb = fallbackIdentity(query);
  const ticker = src?.symbol || fb.ticker;
  const name = src?.name ?? null;

  const out = await renderPrintFile({
    logoData: src?.data,
    isVector: src?.isVector,
    ticker,
    name: name ?? undefined,
    mode,
  });

  return {
    ticker,
    name,
    accent: out.accent,
    found: !!src,
    source: src?.source ?? null,
    previewDataUri: `data:image/png;base64,${out.previewPng.toString("base64")}`,
  };
}

export interface GenerateOptions {
  query: string;
  blankType?: BlankType;
  mode?: DesignMode;
}

/**
 * Full generation: resolve+cache logo -> render print file -> store -> (Printful
 * file upload + mockups + pricing) -> persist Product. Printful steps are
 * skipped when no token is set or the print file isn't publicly reachable.
 */
export async function generateProduct(opts: GenerateOptions): Promise<Product> {
  const blankType: BlankType = opts.blankType ?? "tee";
  let mode: DesignMode = opts.mode ?? "STYLIZED";
  const blank = getBlank(blankType);

  const logo = await resolveLogo(opts.query);
  const fb = fallbackIdentity(opts.query);
  const ticker = logo?.symbol || fb.ticker;
  const name = logo?.name ?? null;

  // EXACT mode is gated by the allowlist; otherwise downgrade to STYLIZED.
  if (mode === "EXACT") {
    const idMatch: Array<Record<string, string>> = [];
    if (logo?.symbol) idMatch.push({ symbol: logo.symbol });
    if (logo?.domain) idMatch.push({ domain: logo.domain });
    const permitted = idMatch.length
      ? await prisma.allowlist.findFirst({
          where: { exactLogoPermitted: true, OR: idMatch },
        })
      : null;
    if (!permitted) mode = "STYLIZED";
  }

  // Render print file (+ preview) from the cached logo bytes.
  const logoData =
    logo && logo.assetUrl
      ? await readAsset(logo.assetUrl, logo.assetKey).catch(() => undefined)
      : undefined;
  const rendered = await renderPrintFile({
    logoData,
    isVector: logo?.isVector,
    ticker,
    name: name ?? undefined,
    mode,
  });

  const base = (logo?.symbol || ticker).toLowerCase();
  const printStore = await putAsset(`prints/${base}-${blankType}-${mode}.png`, rendered.printPng, "image/png");
  const previewStore = await putAsset(`previews/${base}-${blankType}-${mode}.png`, rendered.previewPng, "image/png");

  const design = await prisma.design.create({
    data: {
      logoId: logo?.id ?? (await ensurePlaceholderLogo(ticker)),
      mode,
      template: mode === "EXACT" ? "exact" : "stylized",
      printFileUrl: printStore.url,
      printFileKey: printStore.key,
      previewUrl: previewStore.url,
    },
  });

  // ---- Printful: upload file, mockups, pricing (best-effort) ----
  let mockupUrls: string[] = [];
  let variants: unknown[] = [];
  let baseCostCents = 0;
  let priceCents = defaultPriceCents(blankType);

  const printIsPublic = /^https?:\/\//.test(printStore.url);
  if (process.env.PRINTFUL_API_TOKEN && printIsPublic) {
    try {
      const file = await uploadFile(printStore.url, `${base}-${blankType}.png`);
      const allVariants = await getCatalogVariants(blank.catalogProductId);
      const chosen = allVariants.slice(0, MOCKUP_VARIANT_CAP);
      const variantIds = chosen.map((v) => v.id);

      if (variantIds.length) {
        const mocks = await generateMockups({
          catalogProductId: blank.catalogProductId,
          catalogVariantIds: variantIds,
          placement: blank.placement,
          technique: blank.technique,
          fileId: file.id,
        });
        mockupUrls = mocks.map((m) => m.url);

        const cost = await getVariantBasePrice(variantIds[0]);
        if (cost != null) {
          baseCostCents = Math.round(cost * 100);
          priceCents = Math.round(cost * blank.markup * 100);
        }
        variants = chosen.map((v) => ({
          variantId: v.id,
          size: v.size,
          color: v.color,
          priceCents,
        }));
      }
    } catch (err) {
      // Leave as DRAFT with the local preview; surface in logs for triage.
      console.error("[generate] printful step failed:", err);
    }
  }

  // Persist product (unique slug with collision retry).
  const title = `${name ?? "$" + ticker} ${blank.label}`;
  let slug = `${slugify(name ?? ticker)}-${blankType}`;
  const status = mockupUrls.length ? "ACTIVE" : "DRAFT";

  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.product.create({
        data: {
          slug: attempt ? `${slug}-${design.id.slice(-4)}` : slug,
          title,
          designId: design.id,
          blankType,
          variants: variants as any,
          mockupUrls,
          baseCostCents,
          priceCents,
          status: status as any,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002" && attempt < 1) continue; // slug collision
      throw e;
    }
  }
}

function defaultPriceCents(blankType: BlankType): number {
  return { tee: 2999, hoodie: 5499, mug: 1999 }[blankType];
}

/** When no logo resolves, we still need a LogoCache row to attach the design. */
async function ensurePlaceholderLogo(ticker: string): Promise<string> {
  const existing = await prisma.logoCache.findUnique({ where: { symbol: ticker } });
  if (existing) return existing.id;
  const row = await prisma.logoCache.create({
    data: {
      symbol: ticker,
      source: "none",
      isVector: false,
      assetUrl: "",
      assetKey: "",
      contentType: "none",
    },
  });
  return row.id;
}
