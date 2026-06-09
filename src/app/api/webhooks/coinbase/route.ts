import { NextRequest, NextResponse } from "next/server";
import { verifyCoinbaseSignature } from "@/lib/payments/coinbase";
import { fulfillOrder } from "@/lib/fulfillment";

export const runtime = "nodejs";

// Treat these Coinbase Commerce events as "paid".
const PAID_EVENTS = new Set(["charge:confirmed", "charge:resolved"]);

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-cc-webhook-signature");

  if (!verifyCoinbaseSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const body = JSON.parse(raw);
    const event = body?.event;
    if (event && PAID_EVENTS.has(event.type)) {
      const orderId = event.data?.metadata?.orderId;
      if (orderId) await fulfillOrder(orderId);
    }
  } catch (err) {
    console.error("[coinbase webhook] error:", err);
  }

  return NextResponse.json({ received: true });
}
