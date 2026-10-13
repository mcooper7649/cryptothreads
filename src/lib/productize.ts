import { prisma } from "@/lib/db";
import { generateProduct } from "@/lib/generate";
import { sloganHeat } from "@/lib/signals";
import type { StyleId } from "@/lib/design/styles";

/**
 * Trending memes become real shop products (a tee each, with Printful
 * mockups), so they show up in the shop, on coin pages and in "Hot off the
 * press", not only as studio presets. Run by the collector after each pass.
 */

const PER_RUN = 12;
const HOUR = 3_600_000;
/** Every trending slogan gets a tee; strong ones (score 8+) a hoodie too. */
const HOODIE_AT = 8;

/** Make products for the hottest live trending slogans that are missing them. */
export async function productizeTrending(limit = PER_RUN) {
  const live = await prisma.trendingSlogan.findMany({ where: { hidden: false, expiresAt: { gt: new Date() } } });
  const existing = await prisma.product.findMany({
    where: { design: { slogan: { in: live.map((t) => t.id) } } },
    select: { blankType: true, design: { select: { slogan: true } } },
  });
  const have = new Set(existing.map((p) => `${p.design.slogan}:${p.blankType}`));
  const todo: { t: (typeof live)[number]; blankType: "tee" | "hoodie" }[] = [];
  for (const t of live.sort((a, b) => sloganHeat(b) - sloganHeat(a))) {
    if (!have.has(`${t.id}:tee`)) todo.push({ t, blankType: "tee" });
    if (t.score >= HOODIE_AT && !have.has(`${t.id}:hoodie`)) todo.push({ t, blankType: "hoodie" });
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
  return { disabled: disabled.count, retired: retired.count };
}

/** Disable the products of one slogan (admin hide). */
export async function disableSloganProducts(sloganId: string) {
  return prisma.product.updateMany({
    where: { design: { slogan: sloganId }, status: { not: "DISABLED" } },
    data: { status: "DISABLED", retiredReason: "slogan hidden by admin" },
  });
}
