import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { fulfillOrder } from "@/lib/fulfillment";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: any;
  try {
    if (!secret || !sig) throw new Error("missing webhook secret/signature");
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error("[stripe webhook] signature verification failed:", err?.message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    // "completed" can arrive before an async payment method settles, so only
    // fulfill once Stripe reports the session as paid.
    const session = event.data.object;
    const paid =
      (event.type === "checkout.session.completed" && session?.payment_status === "paid") ||
      event.type === "checkout.session.async_payment_succeeded";
    if (paid && session?.metadata?.orderId) await fulfillOrder(session.metadata.orderId);
  } catch (err) {
    console.error("[stripe webhook] fulfillment error:", err);
    // 200 anyway so Stripe doesn't hammer retries; we log + can replay manually.
  }

  return NextResponse.json({ received: true });
}
