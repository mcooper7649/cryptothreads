import { prisma } from "@/lib/db";
import { resolveLogo, fetchLogoFromSources } from "@/lib/logo/resolve";
import { renderPrintFile } from "@/lib/design/render";
import { putAsset, readAsset } from "@/lib/storage";
import { getBlank, BlankType, retailPriceCents } from "@/lib/printful/blanks";
import { uploadFile } from "@/lib/printful/files";
import { generateMockups } from "@/lib/printful/mockups";
import { getCatalogVariants, getVariantBasePrice, sellableVariants } from "@/lib/printful/catalog";
import { DEFAULT_SLOGAN, DEFAULT_STYLE, STYLES, getSlogan, styleUsesSlogan, type StyleId } from "@/lib/design/styles";
import type { DesignMode, Product } from "@prisma/client";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

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
export interface DesignChoice {
  mode?: DesignMode;
  style?: StyleId;
  slogan?: string;
}

/** Normalize a design choice: styles without a slogan don't carry one. */
export function designChoice(c: DesignChoice) {
  const style = c.style ?? DEFAULT_STYLE;
  return {
    mode: c.mode ?? ("STYLIZED" as DesignMode),
    style,
    slogan: styleUsesSlogan(style) ? getSlogan(c.slogan ?? DEFAULT_SLOGAN).id : null,
  };
}

export async function previewDesign(
  query: string,
  choice: DesignChoice = {},
  blankType: BlankType = "tee"
): Promise<PreviewResult> {
  const { mode, style, slogan } = designChoice(choice);
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
    style,
    slogan: slogan ?? undefined,
    format: getBlank(blankType).format,
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
  style: StyleId;
  slogan: string | null;
  accent: string;
  logoId: string | null;
  /** File-name stem unique to coin + design + format. */
  base: string;
}

/**
 * Resolve+cache the logo, gate the mode, render the print file + preview, and
 * store them. Shared by product generation and order fulfillment so the file a
 * customer previewed is reproduced identically at print time.
 */
export async function buildPrintAsset(
  query: string,
  choice: DesignChoice,
  blankType: BlankType
): Promise<PrintAsset> {
  const { mode: modeIn, style, slogan } = designChoice(choice);
  const format = getBlank(blankType).format;
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
    style,
    slogan: slogan ?? undefined,
    format,
  });

  const design = mode === "EXACT" ? "exact" : [style, slogan].filter(Boolean).join("-");
  const base = slugify(`${logo?.symbol || ticker}-${design}-${format}`);
  const printStore = await putAsset(`prints/${base}.png`, rendered.printPng, "image/png");
  const previewStore = await putAsset(`previews/${base}.png`, rendered.previewPng, "image/png");

  return {
    printUrl: printStore.url,
    printKey: printStore.key,
    previewUrl: previewStore.url,
    ticker,
    name,
    mode,
    style,
    slogan,
    accent: rendered.accent,
    logoId: logo?.id ?? null,
    base,
  };
}

export interface GenerateOptions extends DesignChoice {
  query: string;
  blankType?: BlankType;
}

/**
 * Full generation: build print asset -> persist Design -> (Printful file upload
 * + mockups + pricing) -> persist Product. Printful steps are skipped when no
 * token is set or the print file isn't publicly reachable.
 */
export async function generateProduct(opts: GenerateOptions): Promise<Product> {
  const blankType: BlankType = opts.blankType ?? "tee";
  const blank = getBlank(blankType);

  const asset = await buildPrintAsset(opts.query, opts, blankType);
  const { ticker, mode, style, slogan, base } = asset;

  const design = await prisma.design.create({
    data: {
      logoId: asset.logoId ?? (await ensurePlaceholderLogo(ticker)),
      mode,
      template: mode === "EXACT" ? "exact" : style,
      style,
      slogan,
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
      const file = await uploadFile(asset.printUrl, `${base}.png`);
      // Black garments only (designs are light-on-dark); square stickers only.
      const chosen = sellableVariants(blank, await getCatalogVariants(blank.catalogProductId));
      const variantIds = chosen.map((v) => v.id);

      if (variantIds.length) {
        const mocks = await generateMockups({
          catalogProductId: blank.catalogProductId,
          // One mockup is enough: every variant is the same color (or the same sticker).
          catalogVariantIds: [(chosen.find((v) => v.size === "M" || v.size === "4″×4″") ?? chosen[0]).id],
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
            `mockups/${base}-${blankType}-${i}.png`,
            Buffer.from(await res.arrayBuffer()),
            "image/png"
          );
          mockupUrls.push(stored.url);
        }

        // Retail price is fixed per blank (the same price checkout charges);
        // the Printful cost is recorded so the admin can watch margins.
        // Record the cost of a typical size (M) rather than whichever variant is listed first.
        const typical = chosen.find((v) => v.size === "M" || v.size === "4″×4″") ?? chosen[0];
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
  const styleLabel = mode === "EXACT" ? "Logo" : STYLES.find((x) => x.id === style)!.label;
  const sloganText = slogan ? ` “${titleCase(getSlogan(slogan).lines.join(" "))}”` : "";
  const title = `$${ticker}${sloganText} ${styleLabel} ${blank.label}`;
  const slug = slugify(`${ticker}-${mode === "EXACT" ? "logo" : style}-${slogan ?? ""}-${blankType}`);
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
