import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allow, clientIp } from "@/lib/rate-limit";
import { bump, isBot } from "@/lib/signals";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.literal("carts"),
  query: z.string().max(64),
  blankType: z.string().max(20),
  style: z.string().max(20).optional(),
  slogan: z.string().max(64).nullish(),
});

/** Add-to-cart beacon from the browser. Views are counted server-side; orders by the Stripe webhook. */
export async function POST(req: NextRequest) {
  if (isBot(req.headers.get("user-agent")) || !allow(`signal:${clientIp(req)}`, 30, 60_000)) {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (parsed.success) await bump(parsed.data.kind, parsed.data);
  return new NextResponse(null, { status: 204 });
}
