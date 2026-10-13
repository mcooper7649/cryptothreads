/**
 * What we sell: each blank maps to a Printful v2 catalog product (IDs checked
 * against GET /v2/catalog-products on 2026-10-08; tanks, women's, mug and hat
 * on 2026-10-12) plus our retail price.
 * Safe to import from client components: no env or server-only code.
 */
export const BLANK_TYPES = [
  "tee", "boxy", "longsleeve", "tank", "crewneck", "hoodie",
  "womens_tee", "womens_tank",
  "hat", "mug", "sticker",
] as const;
export type BlankType = (typeof BLANK_TYPES)[number];

/** Shop departments. Unisex staples are listed as men's & unisex. */
export const CATEGORIES = [
  { id: "mens", label: "Men's & unisex" },
  { id: "womens", label: "Women's" },
  { id: "accessories", label: "Hats, mugs & stickers" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

const APPAREL = ["S", "M", "L", "XL", "2XL", "3XL"];
const WOMENS = ["S", "M", "L", "XL", "2XL"];

export interface BlankConfig {
  type: BlankType;
  label: string;
  /** Short name for chips and filters. */
  short: string;
  catalogProductId: number;
  placement: string; // Printful placement key
  technique: string;
  priceCents: number;
  /**
   * How the art is laid out: apparel = the portrait print; sticker = on a black
   * backing (white vinyl); mug = black wrap with the art on both sides (white
   * ceramic, since sublimation can't print white); hat = a wide front panel.
   */
  format: "apparel" | "sticker" | "mug" | "hat";
  category: Category;
  /** Sizes we sell, in display order (Printful's labels). */
  sizes: string[];
  /** Garment color to sell; default is black, then the darkest available. */
  color?: string;
  /** Printful cost of a typical variant when we checked, for margin sanity checks. */
  costCents: number;
}

export const BLANKS: Record<BlankType, BlankConfig> = {
  tee: {
    type: "tee", label: "Classic Tee", short: "Tee",
    catalogProductId: 71, placement: "front", technique: "dtg", // Bella+Canvas 3001
    priceCents: 2999, format: "apparel", costCents: 1225, category: "mens", sizes: APPAREL,
  },
  boxy: {
    type: "boxy", label: "Oversized Boxy Tee", short: "Boxy tee",
    catalogProductId: 1592, placement: "front", technique: "dtg", // Bella+Canvas 3010
    priceCents: 3999, format: "apparel", costCents: 1697, category: "mens", sizes: APPAREL,
  },
  longsleeve: {
    type: "longsleeve", label: "Long Sleeve", short: "Long sleeve",
    catalogProductId: 356, placement: "front", technique: "dtg", // Bella+Canvas 3501
    priceCents: 3999, format: "apparel", costCents: 1875, category: "mens", sizes: APPAREL,
  },
  crewneck: {
    type: "crewneck", label: "Crewneck", short: "Crewneck",
    catalogProductId: 145, placement: "front", technique: "dtg", // Gildan 18000
    priceCents: 4999, format: "apparel", costCents: 2025, category: "mens", sizes: APPAREL,
  },
  hoodie: {
    type: "hoodie", label: "Hoodie", short: "Hoodie",
    catalogProductId: 146, placement: "front", technique: "dtg", // Gildan 18500
    priceCents: 5499, format: "apparel", costCents: 2425, category: "mens", sizes: APPAREL,
  },
  sticker: {
    type: "sticker", label: "Sticker", short: "Sticker",
    catalogProductId: 358, placement: "default", technique: "digital", // Kiss-cut
    priceCents: 599, format: "sticker", costCents: 350, category: "accessories", sizes: ["3″×3″", "4″×4″", "5.5″×5.5″"],
  },
  tank: {
    type: "tank", label: "Tank Top", short: "Tank",
    catalogProductId: 248, placement: "front", technique: "dtg", // Bella+Canvas 3480
    priceCents: 2799, format: "apparel", costCents: 1575, category: "mens", sizes: ["S", "M", "L", "XL", "2XL"],
  },
  womens_tee: {
    type: "womens_tee", label: "Women's Relaxed Tee", short: "Women's tee",
    catalogProductId: 360, placement: "front", technique: "dtg", // Bella+Canvas 6400
    priceCents: 3299, format: "apparel", costCents: 1750, category: "womens", sizes: WOMENS,
  },
  womens_tank: {
    type: "womens_tank", label: "Women's Racerback Tank", short: "Women's tank",
    catalogProductId: 857, placement: "front", technique: "dtg", // Next Level 1533
    priceCents: 2699, format: "apparel", costCents: 1117, category: "womens", sizes: WOMENS,
  },
  hat: {
    type: "hat", label: "Dad Hat", short: "Hat",
    catalogProductId: 206, placement: "front_dtf_hat", technique: "dtfilm", // Yupoong 6245CM, full-color DTF front
    priceCents: 2999, format: "hat", costCents: 1675, category: "accessories", sizes: ["One size"],
  },
  mug: {
    type: "mug", label: "Mug", short: "Mug",
    catalogProductId: 19, placement: "default", technique: "sublimation", // White Glossy Mug, printed black wrap
    priceCents: 1999, format: "mug", costCents: 695, category: "accessories", sizes: ["11 oz", "15 oz"], color: "White",
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
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "3″×3″", "4″×4″", "5.5″×5.5″", "11 oz", "15 oz", "One size"];

/** The size a mockup and the "typical cost" use. */
export const typicalSize = (b: BlankConfig) => (b.sizes.includes("M") ? "M" : b.sizes.includes("4″×4″") ? "4″×4″" : b.sizes[0]);

export const blanksIn = (c: Category) => BLANK_TYPES.filter((t) => BLANKS[t].category === c);
export const sizeRank = (s: string) => SIZE_ORDER.indexOf(s) + 1 || 99;

export const SHIPPING_FLAT_CENTS = (() => {
  const n = parseInt(process.env.SHIPPING_FLAT_CENTS || "", 10);
  return Number.isFinite(n) ? n : 500;
})();
