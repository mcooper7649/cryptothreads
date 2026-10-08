import { pf } from "./client";

export interface Recipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface OrderItemInput {
  catalogVariantId: number;
  quantity: number;
  placement: string;
  technique?: string;
  fileId?: number;
  fileUrl?: string;
}

interface OrderResponse {
  id: number;
  status?: string;
}

function itemPayload(it: OrderItemInput) {
  const layer = it.fileId
    ? { type: "file", id: it.fileId }
    : { type: "file", url: it.fileUrl };
  return {
    source: "catalog",
    catalog_variant_id: it.catalogVariantId,
    quantity: it.quantity,
    placements: [
      {
        placement: it.placement,
        ...(it.technique ? { technique: it.technique } : {}),
        layers: [layer],
      },
    ],
  };
}

/** Create a DRAFT order (not charged/fulfilled until confirmed). */
export async function createDraftOrder(
  recipient: Recipient,
  items: OrderItemInput[],
  externalId?: string
): Promise<OrderResponse> {
  return pf<OrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify({
      // Our order id, so the Printful dashboard links back to it (max 32 chars).
      ...(externalId ? { external_id: externalId.slice(0, 32) } : {}),
      recipient,
      order_items: items.map(itemPayload),
    }),
  });
}

/** Confirm a draft order for fulfillment (this is the billable step). */
export async function confirmOrder(orderId: number): Promise<OrderResponse> {
  return pf<OrderResponse>(`/orders/${orderId}/confirmation`, { method: "POST" });
}
