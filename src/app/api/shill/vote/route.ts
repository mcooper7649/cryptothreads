import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allow, clientIp } from "@/lib/rate-limit";
import { hashIp, vote } from "@/lib/community";

export const runtime = "nodejs";

/** One vote per submission per visitor (by hashed IP). */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allow(`vote:${ip}`, 60, 60 * 60_000)) return NextResponse.json({ error: "Slow down." }, { status: 429 });
  const parsed = z.object({ id: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const r = await vote(parsed.data.id, hashIp(ip));
  if ("error" in r) return NextResponse.json(r, { status: r.error === "not found" ? 404 : 409 });
  return NextResponse.json(r);
}
