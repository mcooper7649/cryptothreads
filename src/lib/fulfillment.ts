import { prisma } from "@/lib/db";
import { buildPrintAsset } from "@/lib/generate";
import { getBlank, BlankType } from "@/lib/printful/blanks";
import { getCatalogVariants } from "@/lib/printful/catalog";
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

/** Pick the catalog variant matching size (+ a default dark color when possible). */
function pickVariantId(
  variants: { id: number; size?: string; color?: string }[],
  size?: string
): number | null {
  if (!variants.length) return null;
  const bySize = size
    ? variants.filter((v) => (v.size || "").toUpperCase() === size.toUpperCase())
    : variants;
  const pool = bySize.length ? bySize : variants;
  const dark = pool.find((v) => /black|dark|charcoal/i.test(v.color || ""));
  return (dark ?? pool[0]).id;
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
