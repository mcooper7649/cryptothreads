import { prisma } from "@/lib/db";
import { fetchLogoFromSources } from "@/lib/logo/resolve";
import { renderPrintFile } from "@/lib/design/render";
import { runsOffEdge } from "@/lib/design/render-check";
import { STYLES, type StyleId } from "@/lib/design/styles";
import { putAsset } from "@/lib/storage";
import { nearDuplicate, normalizeLines, rejectReason, squash, tickerRejectReason } from "@/lib/trend-filter";
import { TRENDING_PREFIX } from "@/lib/slogans";

export const SLOGAN_STYLES = STYLES.filter((s) => s.slogan).map((s) => s.id) as StyleId[];
const FALLBACK_COINS = ["BTC", "ETH", "SOL", "DOGE"];
const SAFE_STYLE: StyleId = "slogan";

export interface SloganCandidate {
  lines: string[];
  ticker?: string;
  style?: string;
  blurb?: string;
  source?: string;
  score?: number;
  /** Fixed id (events); default is derived from the text. */
  id?: string;
  /**
   * The ticker came from a vetted source (DEX/CoinGecko trending, events,
   * community): print it type-only when no logo resolves, instead of moving
   * the slogan onto a big coin.
   */
  keepTicker?: boolean;
}

export type PublishResult = { status: "created" | "refreshed"; id: string } | { status: "rejected"; reason: string };

export const sloganIdFor = (lines: string[]) => `${TRENDING_PREFIX}${squash(lines.join("-")).slice(0, 36)}`;

/**
 * Filter, de-duplicate, render once and publish a trending slogan. A slogan
 * seen again keeps one row and gets its expiry pushed out (and the higher score).
 */
export async function publishSlogan(c: SloganCandidate, expiresAt: Date, i = 0): Promise<PublishResult> {
  const lines = normalizeLines(c.lines);
  const reason = rejectReason(lines);
  if (reason) return { status: "rejected", reason };
  const id = c.id ?? sloganIdFor(lines);
  const score = c.score ?? 0;

  const existing = await prisma.trendingSlogan.findUnique({ where: { id } });
  if (existing) {
    if (existing.hidden) return { status: "rejected", reason: "hidden by admin" };
    await prisma.trendingSlogan.update({
      where: { id },
      data: {
        score: Math.max(existing.score, score),
        expiresAt: existing.expiresAt > expiresAt ? existing.expiresAt : expiresAt,
      },
    });
    return { status: "refreshed", id };
  }
  // The same joke reworded, against what's live or ran in the last two weeks (events reuse fixed ids).
  if (!c.id) {
    const recent = await prisma.trendingSlogan.findMany({
      where: { OR: [{ expiresAt: { gt: new Date() } }, { createdAt: { gt: new Date(Date.now() - 14 * 86_400_000) } }] },
      select: { lines: true },
    });
    const twin = recent.find((r) => nearDuplicate(lines, r.lines));
    if (twin) return { status: "rejected", reason: `same joke as ${twin.lines.join(" / ")}` };
  }

  let style = SLOGAN_STYLES.includes(c.style as StyleId) ? (c.style as StyleId) : SLOGAN_STYLES[i % SLOGAN_STYLES.length];
  let ticker = (c.ticker || "").replace(/^\$/, "").toUpperCase();
  if (ticker && tickerRejectReason(ticker)) {
    if (c.keepTicker) return { status: "rejected", reason: tickerRejectReason(ticker)! };
    ticker = "";
  }
  // Show it on the suggested coin when we can find its logo (or the ticker is vetted), else on a big one.
  let logo = ticker ? await fetchLogoFromSources(ticker).catch(() => null) : null;
  if (!logo && !(c.keepTicker && ticker)) {
    ticker = FALLBACK_COINS[i % FALLBACK_COINS.length];
    logo = await fetchLogoFromSources(ticker).catch(() => null);
  }

  try {
    const render = (st: StyleId) =>
      renderPrintFile({ logoData: logo?.data, isVector: logo?.isVector, ticker, style: st, sloganLines: lines, previewOnly: true });
    let out = await render(style);
    // Ran off the canvas in its style: the plain meme layout fits anything the filter allows.
    if (await runsOffEdge(out.previewPng)) {
      console.warn("[trending] runs off the edge in", style, "->", SAFE_STYLE, id);
      style = SAFE_STYLE;
      out = await render(style);
      if (await runsOffEdge(out.previewPng)) return { status: "rejected", reason: "doesn't fit the print area" };
    }
    const stored = await putAsset(`trending/${id}-${style}-${ticker.toLowerCase()}.png`, out.previewPng, "image/png");
    await prisma.trendingSlogan.create({
      data: {
        id,
        lines,
        ticker,
        style,
        blurb: c.blurb ?? "",
        source: c.source ?? "unknown",
        score,
        previewUrl: stored.url,
        expiresAt,
      },
    });
    return { status: "created", id };
  } catch (e) {
    console.error("[trending] render failed:", id, e);
    return { status: "rejected", reason: "render failed" };
  }
}
