import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allow, clientIp } from "@/lib/rate-limit";
import { hashIp, submitIdea } from "@/lib/community";

export const runtime = "nodejs";

const Body = z.object({
  ticker: z.string().min(1).max(12),
  lines: z.array(z.string().max(40)).min(1).max(3),
});

/** Submit a coin + slogan to the community board. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allow(`shill:${ip}`, 10, 60 * 60_000)) return NextResponse.json({ error: "Slow down." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give us a ticker and 1-3 lines." }, { status: 400 });
  const r = await submitIdea(parsed.data, hashIp(ip));
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ id: r.submission.id, lines: r.submission.lines, ticker: r.submission.ticker }, { status: 201 });
}
