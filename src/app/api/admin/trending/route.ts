import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { fetchLogoFromSources } from "@/lib/logo/resolve";
import { renderPrintFile } from "@/lib/design/render";
import { STYLES, type StyleId } from "@/lib/design/styles";
import { putAsset } from "@/lib/storage";
import { normalizeLines, rejectReason, squash } from "@/lib/trend-filter";
import { TRENDING_PREFIX } from "@/lib/slogans";

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

const SLOGAN_STYLES = STYLES.filter((s) => s.slogan).map((s) => s.id) as StyleId[];
const FALLBACK_COINS = ["BTC", "ETH", "SOL", "DOGE"];

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
      })
    )
    .max(30),
});

/**
 * Ingest candidates from the trend collector. Each one is filtered, de-duplicated
 * against what's already live, rendered once and published straight away
 * (auto-publish; /admin can hide any of them). A slogan seen again gets its
 * expiry pushed out instead of a second copy.
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
    const c = candidates[i];
    const lines = normalizeLines(c.lines);
    const reason = rejectReason(lines);
    if (reason) {
      rejected.push({ lines, reason });
      continue;
    }
    const id = `${TRENDING_PREFIX}${squash(lines.join("-")).slice(0, 36)}`;

    const existing = await prisma.trendingSlogan.findUnique({ where: { id } });
    if (existing) {
      if (existing.hidden) {
        rejected.push({ lines, reason: "hidden by admin" });
        continue;
      }
      await prisma.trendingSlogan.update({
        where: { id },
        data: {
          score: Math.max(existing.score, c.score),
          expiresAt: existing.expiresAt > expiresAt ? existing.expiresAt : expiresAt,
        },
      });
      refreshed.push(id);
      continue;
    }

    const style = SLOGAN_STYLES.includes(c.style as StyleId) ? (c.style as StyleId) : SLOGAN_STYLES[i % SLOGAN_STYLES.length];
    // Show it on the suggested coin when we can find its logo, else on a big one.
    let ticker = (c.ticker || "").replace(/^\$/, "").toUpperCase();
    let logo = ticker ? await fetchLogoFromSources(ticker).catch(() => null) : null;
    if (!logo) {
      ticker = FALLBACK_COINS[i % FALLBACK_COINS.length];
      logo = await fetchLogoFromSources(ticker).catch(() => null);
    }

    try {
      const out = await renderPrintFile({
        logoData: logo?.data,
        isVector: logo?.isVector,
        ticker,
        style,
        sloganLines: lines,
        previewOnly: true,
      });
      const stored = await putAsset(`trending/${id}-${style}-${ticker.toLowerCase()}.png`, out.previewPng, "image/png");
      await prisma.trendingSlogan.create({
        data: { id, lines, ticker, style, blurb: c.blurb, source: c.source, score: c.score, previewUrl: stored.url, expiresAt },
      });
      created.push(id);
    } catch (e) {
      console.error("[trending] render failed:", id, e);
      rejected.push({ lines, reason: "render failed" });
    }
  }

  return NextResponse.json({ created, refreshed, rejected });
}

const Patch = z.object({ id: z.string().min(1).max(64), hidden: z.boolean() });

/** Hide (or unhide) a trending slogan. Hidden ones vanish from the site and can't be bought. */
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const entry = await prisma.trendingSlogan
    .update({ where: { id: parsed.data.id }, data: { hidden: parsed.data.hidden } })
    .catch(() => null);
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ entry });
}
