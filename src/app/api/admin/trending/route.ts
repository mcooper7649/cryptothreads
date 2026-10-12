import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { normalizeLines } from "@/lib/trend-filter";
import { publishSlogan } from "@/lib/trending-publish";
import { disableSloganProducts } from "@/lib/productize";

export const runtime = "nodejs";

/** Admin list: everything from the last 30 days, hidden and expired included. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const since = new Date(Date.now() - 30 * 86_400_000);
  const entries = await prisma.trendingSlogan.findMany({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

const Body = z.object({
  ttlDays: z.number().min(1).max(30).default(7),
  candidates: z
    .array(
      z.object({
        lines: z.array(z.string().max(40)).min(1).max(5),
        ticker: z.string().max(12).optional(),
        style: z.string().max(20).optional(),
        blurb: z.string().max(140).default(""),
        source: z.string().max(20).default("unknown"),
        score: z.number().min(0).max(1000).default(0),
        keepTicker: z.boolean().optional(),
      })
    )
    .max(30),
});

/**
 * Ingest candidates from the trend collector. Each one is filtered, de-duplicated
 * against what's already live, rendered once and published straight away
 * (auto-publish; /admin can hide any of them). See publishSlogan.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { ttlDays, candidates } = parsed.data;
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  const created: string[] = [];
  const refreshed: string[] = [];
  const rejected: { lines: string[]; reason: string }[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const r = await publishSlogan(candidates[i], expiresAt, i);
    if (r.status === "created") created.push(r.id);
    else if (r.status === "refreshed") refreshed.push(r.id);
    else if ("reason" in r) rejected.push({ lines: normalizeLines(candidates[i].lines), reason: r.reason });
  }

  return NextResponse.json({ created, refreshed, rejected });
}

const Patch = z.object({ id: z.string().min(1).max(64), hidden: z.boolean().optional(), pinned: z.boolean().optional() });

/**
 * Hide/unhide or pin/unpin a trending slogan. Hidden ones vanish from the site
 * and can't be bought; pinned ones stay in the studio after they expire.
 */
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const entry = await prisma.trendingSlogan
    .update({ where: { id: parsed.data.id }, data: { hidden: parsed.data.hidden, pinned: parsed.data.pinned } })
    .catch(() => null);
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  // A hidden slogan can't be bought, so its shop products come down with it.
  if (parsed.data.hidden) await disableSloganProducts(entry.id);
  return NextResponse.json({ entry });
}
