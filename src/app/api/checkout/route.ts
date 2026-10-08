import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { retailPriceCents, SHIPPING_FLAT_CENTS } from "@/lib/printful/blanks";
import { createStripeCheckout } from "@/lib/payments/stripe";
import { createCoinbaseCharge } from "@/lib/payments/coinbase";
import { paymentProviders, shipCountries } from "@/lib/store-config";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  provider: z.enum(["STRIPE", "COINBASE"]),
  email: z.string().email(),
  shipping: z.object({
    name: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state_code: z.string().optional(),
    country_code: z.string().length(2),
    zip: z.string().min(1),
    phone: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        query: z.string().min(1),
        // Mugs are white and the designs are light-on-dark, so they are not sold yet.
        blankType: z.enum(["tee", "hoodie"]),
        mode: z.enum(["STYLIZED", "EXACT"]),
        size: z.string().optional(),
        qty: z.number().int().min(1).max(20),
        title: z.string().optional(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  if (!allow(`checkout:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "rate limited", message: "Too many checkout attempts. Try again in a few minutes." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { provider, email, shipping, items } = parsed.data;
  if (!paymentProviders().includes(provider)) {
    return NextResponse.json({ error: "provider unavailable", message: "That payment method isn't available right now." }, { status: 400 });
  }
  if (!shipCountries().includes(shipping.country_code.toUpperCase())) {
    return NextResponse.json({ error: "country unavailable", message: "We don't ship to that country yet." }, { status: 400 });
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Recompute prices server-side (never trust client amounts).
  const priced = items.map((it) => ({
    ...it,
    priceCents: retailPriceCents(it.blankType),
    title: it.title || `$${it.query.toUpperCase()} ${it.blankType}`,
  }));
  const subtotalCents = priced.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const totalCents = subtotalCents + SHIPPING_FLAT_CENTS;

  try {
    const order = await prisma.order.create({
      data: {
        email,
        items: priced as any,
        shipping: { ...shipping, email } as any,
        subtotalCents,
        totalCents,
        provider,
        status: "PENDING",
      },
    });

    if (provider === "STRIPE") {
      const { url, id } = await createStripeCheckout({
        orderId: order.id,
        email,
        lines: priced.map((p) => ({ title: p.title, priceCents: p.priceCents, qty: p.qty })),
        shippingCents: SHIPPING_FLAT_CENTS,
        successUrl: `${site}/order/success?o=${order.id}`,
        cancelUrl: `${site}/cart`,
      });
      await prisma.order.update({ where: { id: order.id }, data: { externalPayId: id } });
      return NextResponse.json({ url });
    }

    // COINBASE
    const { url, code } = await createCoinbaseCharge({
      orderId: order.id,
      amountCents: totalCents,
      name: "CryptoThreads order",
      description: priced.map((p) => `${p.qty}× ${p.title}`).join(", ").slice(0, 200),
      redirectUrl: `${site}/order/success?o=${order.id}`,
      cancelUrl: `${site}/cart`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { externalPayId: code } });
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[/api/checkout]", err);
    return NextResponse.json(
      { error: "checkout failed", message: "Couldn't start checkout. Please try again in a minute." },
      { status: 500 }
    );
  }
}
