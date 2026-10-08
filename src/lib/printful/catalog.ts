import { pf } from "./client";
import type { BlankConfig } from "./blanks";

export interface CatalogVariant {
  id: number;
  name?: string;
  size?: string;
  color?: string;
  color_code?: string;
}

/** All variants (size/color) for a catalog product. The API pages at 20 by default. */
export async function getCatalogVariants(
  catalogProductId: number
): Promise<CatalogVariant[]> {
  const out: CatalogVariant[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const page = await pf<CatalogVariant[]>(
      `/catalog-products/${catalogProductId}/catalog-variants?limit=100&offset=${offset}`
    );
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

/** Variants we list for a blank: black garments, or square stickers (not the bumper size). */
export function sellableVariants(blank: BlankConfig, variants: CatalogVariant[]): CatalogVariant[] {
  if (blank.format === "sticker") return variants.filter((v) => /^([\d.]+)″×\1″$/.test(v.size || ""));
  return darkVariants(variants);
}

/**
 * Black first, then any other dark color. Designs are light-on-dark, so these
 * are the only garments we list, mock up or fulfill.
 */
export function darkVariants(variants: CatalogVariant[]): CatalogVariant[] {
  const black = variants.filter((v) => (v.color || "").toLowerCase() === "black");
  if (black.length) return black;
  const dark = variants.filter((v) => /black|dark|charcoal/i.test(v.color || ""));
  const first = dark[0]?.color;
  return first ? dark.filter((v) => v.color === first) : [];
}

/**
 * Base (wholesale) price for a catalog variant, in major currency units.
 * Response shape varies in beta; parse defensively.
 */
export async function getVariantBasePrice(
  catalogVariantId: number,
  technique = "dtg"
): Promise<number | null> {
  try {
    const data = await pf<any>(`/catalog-variants/${catalogVariantId}/prices`);
    // v2 shape: { variant: { techniques: [{ technique_key, price, discounted_price }] } }
    const techs: any[] = data?.variant?.techniques ?? [];
    const t = techs.find((x) => x?.technique_key === technique) ?? techs[0];
    const raw = t?.discounted_price ?? t?.price ?? data?.price ?? data?.variant?.price;
    const n = typeof raw === "string" ? parseFloat(raw) : raw;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
