import { prisma } from "@/lib/db";
import { resolveLogo, fetchLogoFromSources } from "@/lib/logo/resolve";
import { renderPrintFile } from "@/lib/design/render";
import { putAsset, readAsset } from "@/lib/storage";
import { getBlank, BlankType, retailPriceCents } from "@/lib/printful/blanks";
import { uploadFile } from "@/lib/printful/files";
import { generateMockups } from "@/lib/printful/mockups";
import { darkVariants, getCatalogVariants, getVariantBasePrice } from "@/lib/printful/catalog";
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
    previewOnly: true,
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

/** Apply the EXACT-logo allowlist gate; downgrade to STYLIZED when not cleared. */
async function gateMode(
  mode: DesignMode,
  logo: { symbol: string | null; domain: string | null } | null
): Promise<DesignMode> {
  if (mode !== "EXACT") return mode;
  const idMatch: Array<Record<string, string>> = [];
  if (logo?.symbol) idMatch.push({ symbol: logo.symbol });
  if (logo?.domain) idMatch.push({ domain: logo.domain });
  if (!idMatch.length) return "STYLIZED";
  const permitted = await prisma.allowlist.findFirst({
    where: { exactLogoPermitted: true, OR: idMatch },
  });
  return permitted ? "EXACT" : "STYLIZED";
}

export interface PrintAsset {
  printUrl: string;
  printKey: string;
  previewUrl: string;
  ticker: string;
  name: string | null;
  mode: DesignMode;
  accent: string;
  logoId: string | null;
  base: string;
}

/**
 * Resolve+cache the logo, gate the mode, render the print file + preview, and
 * store them. Shared by product generation and order fulfillment so the file a
 * customer previewed is reproduced identically at print time.
 */
export async function buildPrintAsset(
  query: string,
  modeIn: DesignMode,
  blankType: BlankType
): Promise<PrintAsset> {
  const logo = await resolveLogo(query);
  const fb = fallbackIdentity(query);
  const ticker = logo?.symbol || fb.ticker;
  const name = logo?.name ?? null;
  const mode = await gateMode(modeIn, logo ?? null);

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

  return {
    printUrl: printStore.url,
    printKey: printStore.key,
    previewUrl: previewStore.url,
    ticker,
    name,
    mode,
    accent: rendered.accent,
    logoId: logo?.id ?? null,
    base,
  };
}

export interface GenerateOptions {
  query: string;
  blankType?: BlankType;
  mode?: DesignMode;
}

/**
 * Full generation: build print asset -> persist Design -> (Printful file upload
 * + mockups + pricing) -> persist Product. Printful steps are skipped when no
 * token is set or the print file isn't publicly reachable.
 */
export async function generateProduct(opts: GenerateOptions): Promise<Product> {
  const blankType: BlankType = opts.blankType ?? "tee";
  const blank = getBlank(blankType);

  const asset = await buildPrintAsset(opts.query, opts.mode ?? "STYLIZED", blankType);
  const { ticker, name, mode, base } = asset;

  const design = await prisma.design.create({
    data: {
      logoId: asset.logoId ?? (await ensurePlaceholderLogo(ticker)),
      mode,
      template: mode === "EXACT" ? "exact" : "stylized",
      printFileUrl: asset.printUrl,
      printFileKey: asset.printKey,
      previewUrl: asset.previewUrl,
    },
  });

  // ---- Printful: upload file, mockups, pricing (best-effort) ----
  let mockupUrls: string[] = [];
  let variants: unknown[] = [];
  let baseCostCents = 0;
  const priceCents = retailPriceCents(blankType);

  const printIsPublic = /^https?:\/\//.test(asset.printUrl);
  if (process.env.PRINTFUL_API_TOKEN && printIsPublic) {
    try {
      const file = await uploadFile(asset.printUrl, `${base}-${blankType}.png`);
      const allVariants = await getCatalogVariants(blank.catalogProductId);
      // Print files are light-on-dark, so list and mock up dark garments only
      // (one per size). Mugs have no color/size split, so they keep the first variants.
      const dark = darkVariants(allVariants);
      const pool = dark.length ? dark : allVariants;
      const chosen = blankType === "mug" ? pool.slice(0, MOCKUP_VARIANT_CAP) : pool;
      const variantIds = chosen.map((v) => v.id);

      if (variantIds.length) {
        const mocks = await generateMockups({
          catalogProductId: blank.catalogProductId,
          // One mockup is enough when every variant is the same garment color.
          catalogVariantIds: variantIds.slice(0, blankType === "mug" ? MOCKUP_VARIANT_CAP : 1),
          placement: blank.placement,
          technique: blank.technique,
          fileId: file.id,
        });
        // Printful's mockup URLs are temporary (/tmp/ on S3), so keep our own copies.
        mockupUrls = [];
        for (let i = 0; i < mocks.length; i++) {
          const res = await fetch(mocks[i].url);
          if (!res.ok) continue;
          const stored = await putAsset(
            `mockups/${base}-${blankType}-${mode}-${i}.png`,
            Buffer.from(await res.arrayBuffer()),
            "image/png"
          );
          mockupUrls.push(stored.url);
        }

        // Retail price is fixed per blank (the same price checkout charges);
        // the Printful cost is recorded so the admin can watch margins.
        // Record the cost of a typical size (M) rather than whichever variant is listed first.
        const typical = chosen.find((v) => v.size === "M") ?? chosen[0];
        const cost = await getVariantBasePrice(typical.id, blank.technique);
        if (cost != null) baseCostCents = Math.round(cost * 100);
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
  const slug = `${slugify(name ?? ticker)}-${blankType}`;
  const status = mockupUrls.length ? "ACTIVE" : "DRAFT";

  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.product.create({
        data: {
          slug: attempt ? `${slug}-${design.id.slice(-4)}` : slug,
          title,
          query: opts.query,
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
