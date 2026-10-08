import { prisma } from "@/lib/db";
import { buildPrintAsset } from "@/lib/generate";
import { getBlank, BlankType } from "@/lib/printful/blanks";
import { darkVariants, getCatalogVariants, type CatalogVariant } from "@/lib/printful/catalog";
import { uploadFile } from "@/lib/printful/files";
import { createDraftOrder, confirmOrder, Recipient, OrderItemInput } from "@/lib/printful/orders";
import type { DesignMode } from "@prisma/client";

interface OrderItemSnapshot {
  query: string;
  blankType: BlankType;
  mode: DesignMode;
  size?: string;
  qty: number;
  title?: string;
}

/** The dark-garment variant in the ordered size (designs are light-on-dark). */
function pickVariantId(variants: CatalogVariant[], size?: string): number | null {
  const pool = darkVariants(variants);
  if (!pool.length) return null;
  const match = size ? pool.find((v) => (v.size || "").toUpperCase() === size.toUpperCase()) : undefined;
  return (match ?? (size ? null : pool[0]))?.id ?? null;
}

/**
 * Turn a PAID order into a Printful order: regenerate each item's print file,
 * map blank+size -> catalog variant, create a draft order (confirm only when
 * PRINTFUL_AUTO_CONFIRM=1). Idempotent: skips orders already submitted.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`fulfillOrder: order ${orderId} not found`);

  // Mark paid regardless; fulfillment may be deferred if Printful isn't wired.
  if (order.paymentStatus !== "PAID") {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID", status: "PAID" },
    });
  }
  if (["SUBMITTED", "FULFILLED", "SHIPPED"].includes(order.status)) return; // idempotent

  if (!process.env.PRINTFUL_API_TOKEN) {
    console.warn(`[fulfillment] order ${orderId} PAID but PRINTFUL_API_TOKEN unset — fulfillment deferred`);
    return;
  }

  const items = order.items as unknown as OrderItemSnapshot[];
  const recipient = order.shipping as unknown as Recipient;
  const pfItems: OrderItemInput[] = [];

  for (const item of items) {
    const blank = getBlank(item.blankType);
    const asset = await buildPrintAsset(item.query, item.mode, item.blankType);
    if (!/^https?:\/\//.test(asset.printUrl)) {
      throw new Error("fulfillment requires a public print file URL (configure Vercel Blob)");
    }
    const file = await uploadFile(asset.printUrl, `${asset.base}-${item.blankType}.png`);
    const variants = await getCatalogVariants(blank.catalogProductId);
    const variantId = pickVariantId(variants, item.size);
    if (!variantId) throw new Error(`no catalog variant for ${item.blankType}/${item.size}`);

    pfItems.push({
      catalogVariantId: variantId,
      quantity: item.qty,
      placement: blank.placement,
      technique: blank.technique,
      fileId: file.id,
    });
  }

  const draft = await createDraftOrder(recipient, pfItems);
  let status: string = "SUBMITTED";
  if (process.env.PRINTFUL_AUTO_CONFIRM === "1") {
    await confirmOrder(draft.id);
    status = "SUBMITTED";
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { printfulOrderId: String(draft.id), status: status as any },
  });
}
