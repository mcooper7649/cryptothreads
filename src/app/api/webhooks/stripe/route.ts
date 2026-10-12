import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { fulfillOrder } from "@/lib/fulfillment";
import { prisma } from "@/lib/db";
import { bump, type DesignRef } from "@/lib/signals";

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
    if (paid && session?.metadata?.orderId) {
      const before = await prisma.order.findUnique({ where: { id: session.metadata.orderId } });
      await fulfillOrder(session.metadata.orderId);
      // Count the sale once (Stripe can send both "completed" and "succeeded").
      if (before && before.paymentStatus !== "PAID") {
        for (const it of before.items as unknown as (DesignRef & { qty?: number })[]) await bump("orders", it, it.qty ?? 1);
      }
    }
  } catch (err) {
    console.error("[stripe webhook] fulfillment error:", err);
    // 200 anyway so Stripe doesn't hammer retries; we log + can replay manually.
  }

  return NextResponse.json({ received: true });
}
