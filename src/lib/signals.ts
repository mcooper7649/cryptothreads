import { prisma } from "@/lib/db";
import { TRENDING_PREFIX } from "@/lib/slogans";
import type { Product, TrendingSlogan } from "@prisma/client";

/**
 * Shopper signals (views, add-to-carts, paid orders) that rank the home page
 * and decide which trending slogans get pinned or dropped. Counting is
 * best-effort: a failed write never breaks the page or the checkout.
 */

export type SignalKind = "views" | "carts" | "orders";

export interface DesignRef {
  query?: string | null;
  blankType?: string | null;
  style?: string | null;
  slogan?: string | null;
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|curl|wget|python|node-fetch/i;
export const isBot = (ua: string | null | undefined) => !ua || BOT.test(ua);

/** Count a signal against the products matching the design and its trending slogan. */
export async function bump(kind: SignalKind, ref: DesignRef, by = 1): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (ref.query && ref.blankType) {
    tasks.push(
      prisma.product.updateMany({
        where: {
          query: { equals: ref.query, mode: "insensitive" },
          blankType: ref.blankType,
          ...(ref.style ? { design: { style: ref.style, slogan: ref.slogan ?? null } } : {}),
        },
        data: { [kind]: { increment: by } },
      })
    );
  }
  if (ref.slogan?.startsWith(TRENDING_PREFIX)) {
    tasks.push(prisma.trendingSlogan.updateMany({ where: { id: ref.slogan }, data: { [kind]: { increment: by } } }));
  }
  await Promise.all(tasks).catch((e) => console.warn("[signals]", kind, e?.message));
}

export async function bumpProduct(id: string, kind: SignalKind): Promise<void> {
  await prisma.product.update({ where: { id }, data: { [kind]: { increment: 1 } } }).catch(() => undefined);
}

export async function bumpSlogan(id: string, kind: SignalKind | "likes", by = 1): Promise<void> {
  await prisma.trendingSlogan.updateMany({ where: { id }, data: { [kind]: { increment: by } } }).catch(() => undefined);
}

const DAY = 86_400_000;

/** Product heat: sales count most, then carts, then views, with a boost while new. */
export function productHeat(p: Pick<Product, "views" | "carts" | "orders" | "createdAt">, now = Date.now()): number {
  const ageDays = (now - p.createdAt.getTime()) / DAY;
  const fresh = Math.max(0, 10 - ageDays * 2); // +10 on day 0, gone after 5 days
  return p.orders * 25 + p.carts * 5 + p.views * 0.2 + fresh;
}

/** Trending heat: the writer's 1-10 score plus what shoppers and X did with it. */
export function sloganHeat(t: Pick<TrendingSlogan, "score" | "views" | "carts" | "orders" | "likes">): number {
  return t.score + t.orders * 10 + t.carts * 2 + t.likes * 0.5 + t.views * 0.05;
}

/** Thresholds the maintenance pass uses. */
export const PIN_IF = { orders: 1, carts: 3, likes: 25 };
export const DUD_IF = { ageHours: 48, views: 40 };
