import { pf } from "./client";

export interface CatalogVariant {
  id: number;
  name?: string;
  size?: string;
  color?: string;
  color_code?: string;
}

/** Variants (size/color) for a catalog product. */
export async function getCatalogVariants(
  catalogProductId: number
): Promise<CatalogVariant[]> {
  const data = await pf<CatalogVariant[]>(
    `/catalog-products/${catalogProductId}/catalog-variants`
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Base (wholesale) price for a catalog variant, in major currency units.
 * Response shape varies in beta; parse defensively.
 */
export async function getVariantBasePrice(
  catalogVariantId: number
): Promise<number | null> {
  try {
    const data = await pf<any>(`/catalog-variants/${catalogVariantId}/prices`);
    const raw =
      data?.price ??
      data?.variant?.price ??
      data?.prices?.[0]?.price ??
      data?.product?.price;
    const n = typeof raw === "string" ? parseFloat(raw) : raw;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
