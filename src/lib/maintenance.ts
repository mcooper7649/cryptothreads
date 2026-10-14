import { prisma } from "@/lib/db";
import { liveEvents } from "@/lib/events";
import { publishSlogan } from "@/lib/trending-publish";
import { DUD_IF, PIN_IF } from "@/lib/signals";
import { TRENDING_PREFIX } from "@/lib/slogans";

/**
 * One pass that keeps the shop fresh. Run by the trend collector after each
 * collection (POST /api/admin/maintain), so three times a day.
 */

const HOUR = 3_600_000;

/** Publish the design for every event in its window; it expires when the event ends. */
export async function syncEvents(now = new Date()) {
  const out: string[] = [];
  for (const w of liveEvents(now)) {
    const id = `${TRENDING_PREFIX}ev-${w.event.key}-${w.start.getUTCFullYear()}`;
    const r = await publishSlogan(
      { id, lines: w.event.lines, ticker: w.event.ticker, style: w.event.style, blurb: w.event.blurb, source: "event", score: 8, keepTicker: true },
      new Date(w.end.getTime() + 24 * HOUR)
    );
    if (r.status !== "rejected") out.push(`${r.status} ${id}`);
    else console.warn("[maintain] event rejected:", id, r.reason);
  }
  return out;
}

/** Pin proven sellers (they stay in the studio for good); end duds early. */
export async function pinAndPrune(now = new Date()) {
  const pinned = await prisma.trendingSlogan.updateMany({
    where: {
      pinned: false,
      hidden: false,
      OR: [{ orders: { gte: PIN_IF.orders } }, { carts: { gte: PIN_IF.carts } }, { likes: { gte: PIN_IF.likes } }],
    },
    data: { pinned: true },
  });
  // Plenty of people looked, nobody bit: take it off the home page.
  const duds = await prisma.trendingSlogan.updateMany({
    where: {
      pinned: false,
      source: { notIn: ["event", "community"] },
      expiresAt: { gt: now },
      createdAt: { lt: new Date(now.getTime() - DUD_IF.ageHours * HOUR) },
      views: { gte: DUD_IF.views },
      carts: 0,
      orders: 0,
    },
    data: { expiresAt: now },
  });
  return { pinned: pinned.count, duds: duds.count };
}

const GECKO = "https://api.coingecko.com/api/v3";
const RETIRE_BELOW = 2_000_000; // 24h USD volume
const REVIVE_ABOVE = 4_000_000;

/**
 * Coin products whose coin has gone quiet (24h volume under $2M) leave the shop
 * as DRAFT with a reason; they come back when volume recovers. Coins CoinGecko
 * doesn't return are left alone (unknown isn't dead), as are website queries.
 */
export async function retireDeadCoins() {
  const rows = await prisma.product.findMany({
    // Only revive what this check retired (other retirements, like "trend over", stay down).
    where: { OR: [{ status: "ACTIVE" }, { status: "DRAFT", retiredReason: { startsWith: "24h volume" } }], query: { not: null } },
    select: { id: true, query: true, status: true, retiredReason: true },
  });
  const symbols = Array.from(new Set(rows.map((r) => r.query!.toUpperCase()).filter((q) => /^[A-Z0-9]{2,10}$/.test(q))));
  if (!symbols.length) return { retired: 0, revived: 0 };

  const volume = new Map<string, number>();
  const key = process.env.COINGECKO_DEMO_KEY;
  for (let i = 0; i < symbols.length; i += 50) {
    const batch = symbols.slice(i, i + 50).map((s) => s.toLowerCase()).join(",");
    const res = await fetch(`${GECKO}/coins/markets?vs_currency=usd&include_tokens=top&symbols=${batch}`, {
      headers: key ? { "x-cg-demo-api-key": key } : {},
    });
    if (!res.ok) throw new Error(`coingecko markets ${res.status}`);
    for (const c of (await res.json()) as { symbol: string; total_volume: number | null }[]) {
      volume.set(c.symbol.toUpperCase(), c.total_volume ?? 0);
    }
  }

  let retired = 0;
  let revived = 0;
  for (const r of rows) {
    const v = volume.get(r.query!.toUpperCase());
    if (v == null) continue;
    if (r.status === "ACTIVE" && v < RETIRE_BELOW) {
      await prisma.product.update({
        where: { id: r.id },
        data: { status: "DRAFT", retiredReason: `24h volume $${Math.round(v).toLocaleString("en-US")} (under $2M)` },
      });
      retired++;
    } else if (r.status === "DRAFT" && r.retiredReason?.startsWith("24h volume") && v > REVIVE_ABOVE) {
      await prisma.product.update({ where: { id: r.id }, data: { status: "ACTIVE", retiredReason: null } });
      revived++;
    }
  }
  return { retired, revived };
}

/** Record likes read off the @FloorFeed posts. Likes only go up, so keep the max. */
export async function recordLikes(items: { id: string; likes: number; tweetUrl?: string | null }[]) {
  for (const it of items) {
    const t = await prisma.trendingSlogan.findUnique({ where: { id: it.id }, select: { likes: true } });
    if (!t) continue;
    await prisma.trendingSlogan.update({
      where: { id: it.id },
      data: { likes: Math.max(t.likes, it.likes), ...(it.tweetUrl ? { tweetUrl: it.tweetUrl } : {}) },
    });
  }
  return items.length;
}

/**
 * Checkouts nobody paid: Stripe sessions die after 24h, but bank debits can settle
 * days later, so wait a week. A payment that does land still fulfills (the webhook
 * marks the order PAID whatever its status).
 */
export async function expireAbandonedCheckouts(now = new Date()) {
  const r = await prisma.order.updateMany({
    where: { status: "PENDING", paymentStatus: "UNPAID", createdAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
    data: { status: "CANCELLED" },
  });
  return { cancelled: r.count };
}
