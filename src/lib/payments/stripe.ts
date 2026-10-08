import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  client = new Stripe(key);
  return client;
}

export interface CheckoutLine {
  title: string;
  priceCents: number;
  qty: number;
}

/**
 * Create a Stripe Checkout Session. Shipping address is collected on our own
 * form (stored on the Order) and reused for crypto too, so we add shipping as
 * a flat line rate here rather than via Stripe's address collection.
 */
export async function createStripeCheckout(opts: {
  orderId: string;
  email?: string;
  lines: CheckoutLine[];
  shippingCents: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; id: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.email,
    // Ask Stripe to email a receipt even if dashboard receipts are off.
    ...(opts.email ? { payment_intent_data: { receipt_email: opts.email } } : {}),
    line_items: [
      ...opts.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "usd",
          unit_amount: l.priceCents,
          product_data: { name: l.title },
        },
      })),
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.shippingCents,
          product_data: { name: "Shipping" },
        },
      },
    ],
    metadata: { orderId: opts.orderId },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
  if (!session.url) throw new Error("stripe: no session url");
  return { url: session.url, id: session.id };
}
