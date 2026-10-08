/**
 * What we sell: each blank maps to a Printful v2 catalog product (IDs checked
 * against GET /v2/catalog-products on 2026-10-08) plus our retail price.
 * Safe to import from client components: no env or server-only code.
 */
export const BLANK_TYPES = ["tee", "boxy", "longsleeve", "crewneck", "hoodie", "sticker"] as const;
export type BlankType = (typeof BLANK_TYPES)[number];

export interface BlankConfig {
  type: BlankType;
  label: string;
  /** Short name for chips and filters. */
  short: string;
  catalogProductId: number;
  placement: string; // Printful placement key
  technique: string;
  priceCents: number;
  /** "sticker" designs are rendered onto a black backing (stickers are white vinyl). */
  format: "apparel" | "sticker";
  /** Printful cost of a typical variant when we checked, for margin sanity checks. */
  costCents: number;
}

export const BLANKS: Record<BlankType, BlankConfig> = {
  tee: {
    type: "tee", label: "Classic Tee", short: "Tee",
    catalogProductId: 71, placement: "front", technique: "dtg", // Bella+Canvas 3001
    priceCents: 2999, format: "apparel", costCents: 1225,
  },
  boxy: {
    type: "boxy", label: "Oversized Boxy Tee", short: "Boxy tee",
    catalogProductId: 1592, placement: "front", technique: "dtg", // Bella+Canvas 3010
    priceCents: 3999, format: "apparel", costCents: 1697,
  },
  longsleeve: {
    type: "longsleeve", label: "Long Sleeve", short: "Long sleeve",
    catalogProductId: 356, placement: "front", technique: "dtg", // Bella+Canvas 3501
    priceCents: 3999, format: "apparel", costCents: 1875,
  },
  crewneck: {
    type: "crewneck", label: "Crewneck", short: "Crewneck",
    catalogProductId: 145, placement: "front", technique: "dtg", // Gildan 18000
    priceCents: 4999, format: "apparel", costCents: 2025,
  },
  hoodie: {
    type: "hoodie", label: "Hoodie", short: "Hoodie",
    catalogProductId: 146, placement: "front", technique: "dtg", // Gildan 18500
    priceCents: 5499, format: "apparel", costCents: 2425,
  },
  sticker: {
    type: "sticker", label: "Sticker", short: "Sticker",
    catalogProductId: 358, placement: "default", technique: "digital", // Kiss-cut
    priceCents: 599, format: "sticker", costCents: 350,
  },
};

export function getBlank(type: BlankType): BlankConfig {
  return BLANKS[type];
}

export function isBlankType(v: unknown): v is BlankType {
  return typeof v === "string" && (BLANK_TYPES as readonly string[]).includes(v);
}

/** Retail price (cents); checkout always recomputes from this. */
export function retailPriceCents(type: BlankType): number {
  return BLANKS[type].priceCents;
}

/** Size options in display order (stickers use Printful's "4″×4″" labels). */
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "3″×3″", "4″×4″", "5.5″×5.5″"];
export const sizeRank = (s: string) => SIZE_ORDER.indexOf(s) + 1 || 99;

export const SHIPPING_FLAT_CENTS = (() => {
  const n = parseInt(process.env.SHIPPING_FLAT_CENTS || "", 10);
  return Number.isFinite(n) ? n : 500;
})();
