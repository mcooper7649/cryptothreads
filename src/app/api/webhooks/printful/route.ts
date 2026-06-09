import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Maps Printful event types to our OrderStatus.
const ORDER_EVENT_STATUS: Record<string, string> = {
  package_shipped: "SHIPPED",
  order_updated: "SUBMITTED",
  order_put_hold: "SUBMITTED",
  order_remove_hold: "SUBMITTED",
  order_failed: "FAILED",
  order_canceled: "CANCELLED",
};

export async function POST(req: NextRequest) {
  // TODO: verify Printful webhook signature once a secret/public key is configured.
  const payload = await req.json().catch(() => null);
  const type: string | undefined = payload?.type;

  if (!type) return NextResponse.json({ ok: true });

  try {
    if (type === "mockup_task_finished") {
      // Our generation flow polls synchronously; log for async/observability.
      console.log("[printful webhook] mockup_task_finished", payload?.data?.id);
      return NextResponse.json({ ok: true });
    }

    const status = ORDER_EVENT_STATUS[type];
    const printfulOrderId =
      payload?.data?.order?.id ?? payload?.data?.id ?? payload?.order?.id;

    if (status && printfulOrderId != null) {
      await prisma.order.updateMany({
        where: { printfulOrderId: String(printfulOrderId) },
        data: { status: status as any },
      });
    }
  } catch (err) {
    console.error("[printful webhook]", err);
  }

  return NextResponse.json({ ok: true });
}
