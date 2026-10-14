import { prisma } from "@/lib/db";
import { generateProduct } from "@/lib/generate";
import { sloganHeat } from "@/lib/signals";
import type { StyleId } from "@/lib/design/styles";
import type { BlankType } from "@/lib/printful/blanks";
import type { TrendingSlogan } from "@prisma/client";

/**
 * Trending memes become real shop products (a tee each, more blanks once they earn
 * them; see LINEUP), with Printful mockups, so they show up in the shop, on coin pages and in "Hot off the
 * press", not only as studio presets. Run by the collector after each pass.
 */

const PER_RUN = 12;
const HOUR = 3_600_000;
/**
 * Which blanks a trending slogan gets. Every trend gets a tee (and a hoodie when the
 * writer rates it 9+); the rest of the lineup waits until shoppers show interest, so
 * the shop isn't 9 unviewed products per joke.
 */
const LINEUP: { blankType: BlankType; minScore?: number }[] = [
  { blankType: "tee", minScore: 0 },
  { blankType: "hoodie", minScore: 9 },
  { blankType: "womens_tee" },
  { blankType: "tank" },
  { blankType: "womens_tank" },
  { blankType: "hat" },
  { blankType: "mug" },
  { blankType: "towel" },
  { blankType: "backpack" },
];
const WAITING = "lineup: waiting for demand";

/** Shoppers (or X) have shown they want this one: it earns the full lineup. */
export const earned = (t: Pick<TrendingSlogan, "views" | "carts" | "orders" | "likes" | "pinned">) =>
  t.pinned || t.orders > 0 || t.carts > 0 || t.views >= 20 || t.likes >= 10;

const wants = (t: TrendingSlogan, l: (typeof LINEUP)[number]) =>
  (l.minScore !== undefined && t.score >= l.minScore) || earned(t);

/** Make products for the hottest live trending slogans that are missing them. */
export async function productizeTrending(limit = PER_RUN, firstIds: string[] = []) {
  const live = await prisma.trendingSlogan.findMany({ where: { hidden: false, expiresAt: { gt: new Date() } } });
  const existing = await prisma.product.findMany({
    where: { design: { slogan: { in: live.map((t) => t.id) } } },
    select: { blankType: true, design: { select: { slogan: true } } },
  });
  const have = new Set(existing.map((p) => `${p.design.slogan}:${p.blankType}`));
  const todo: { t: (typeof live)[number]; blankType: BlankType }[] = [];
  // This run's new slogans first (so their drop is complete), then the rest by heat.
  const first = new Set(firstIds);
  for (const t of live.sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id)) || sloganHeat(b) - sloganHeat(a))) {
    for (const l of LINEUP) {
      if (wants(t, l) && !have.has(`${t.id}:${l.blankType}`)) todo.push({ t, blankType: l.blankType });
    }
  }

  const made: string[] = [];
  const failed: string[] = [];
  for (const { t, blankType } of todo.slice(0, limit)) {
    try {
      const p = await generateProduct({ query: t.ticker, style: t.style as StyleId, slogan: t.id, blankType });
      // DRAFT means Printful didn't return a mockup; it stays out of the shop until a retry works.
      (p.status === "ACTIVE" ? made : failed).push(`${p.slug} (${p.status})`);
    } catch (e) {
      console.error("[productize]", t.id, blankType, e);
      failed.push(`${t.id}:${blankType}`);
    }
  }
  return { made, failed, queued: Math.max(0, todo.length - limit) };
}

/**
 * Trend products whose slogan expired without a single cart or order leave the
 * shop (DRAFT + reason). Pinned slogans and anything that sold stay. Products
 * for hidden slogans are disabled right away.
 */
export async function retireTrendProducts(now = new Date()) {
  const hidden = await prisma.trendingSlogan.findMany({ where: { hidden: true }, select: { id: true } });
  const disabled = await prisma.product.updateMany({
    where: { status: { not: "DISABLED" }, design: { slogan: { in: hidden.map((h) => h.id) } } },
    data: { status: "DISABLED", retiredReason: "slogan hidden by admin" },
  });

  // A day of grace after expiry, so the last viewers can still find it.
  const over = await prisma.trendingSlogan.findMany({
    where: { hidden: false, pinned: false, expiresAt: { lt: new Date(now.getTime() - 24 * HOUR) }, carts: 0, orders: 0 },
    select: { id: true },
  });
  const retired = await prisma.product.updateMany({
    where: { status: "ACTIVE", carts: 0, orders: 0, design: { slogan: { in: over.map((o) => o.id) } } },
    data: { status: "DRAFT", retiredReason: "trend over, no carts" },
  });

  // Blanks a live slogan hasn't earned yet wait in DRAFT; they come back when it does.
  const live = await prisma.trendingSlogan.findMany({ where: { hidden: false, expiresAt: { gt: now } } });
  let waiting = 0;
  let revived = 0;
  for (const l of LINEUP) {
    const yes = live.filter((t) => wants(t, l)).map((t) => t.id);
    const no = live.filter((t) => !wants(t, l)).map((t) => t.id);
    if (no.length) {
      waiting += (await prisma.product.updateMany({
        where: { status: "ACTIVE", blankType: l.blankType, carts: 0, orders: 0, design: { slogan: { in: no } } },
        data: { status: "DRAFT", retiredReason: WAITING },
      })).count;
    }
    if (yes.length) {
      revived += (await prisma.product.updateMany({
        where: { status: "DRAFT", retiredReason: WAITING, blankType: l.blankType, design: { slogan: { in: yes } } },
        data: { status: "ACTIVE", retiredReason: null },
      })).count;
    }
  }
  return { disabled: disabled.count, retired: retired.count, waiting, revived };
}

/** Disable the products of one slogan (admin hide). */
export async function disableSloganProducts(sloganId: string) {
  return prisma.product.updateMany({
    where: { design: { slogan: sloganId }, status: { not: "DISABLED" } },
    data: { status: "DISABLED", retiredReason: "slogan hidden by admin" },
  });
}
