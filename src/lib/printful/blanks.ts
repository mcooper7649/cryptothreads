/**
 * Blank catalog configuration. Maps our blank types to Printful v2 catalog
 * product IDs + the print placement we use.
 *
 * NOTE: catalog product IDs MUST be confirmed against the live v2 catalog
 * (GET /v2/catalog-products) before going live — the values below are the
 * commonly-cited Printful catalog IDs and may differ on your account/region.
 * Override via env without code changes.
 */
export type BlankType = "tee" | "hoodie" | "mug";

export interface BlankConfig {
  type: BlankType;
  label: string;
  catalogProductId: number;
  placement: string; // Printful placement key, e.g. "front"
  technique?: string; // e.g. "dtg"
  /** Fallback markup applied to Printful base cost when computing retail price. */
  markup: number;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const BLANKS: Record<BlankType, BlankConfig> = {
  tee: {
    type: "tee",
    label: "Unisex T-Shirt",
    catalogProductId: envInt("PF_BLANK_TEE", 71), // Bella+Canvas 3001
    placement: "front",
    technique: "dtg",
    markup: 2.2,
  },
  hoodie: {
    type: "hoodie",
    label: "Unisex Hoodie",
    catalogProductId: envInt("PF_BLANK_HOODIE", 146), // Gildan 18500
    placement: "front",
    technique: "dtg",
    markup: 2.0,
  },
  mug: {
    type: "mug",
    label: "Mug",
    catalogProductId: envInt("PF_BLANK_MUG", 19), // 11oz mug
    placement: "default",
    technique: "sublimation",
    markup: 2.5,
  },
};

export function getBlank(type: BlankType): BlankConfig {
  return BLANKS[type];
}
