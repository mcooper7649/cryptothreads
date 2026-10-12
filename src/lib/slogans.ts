import { prisma } from "@/lib/db";
import { DEFAULT_SLOGAN, SLOGANS, getSlogan, type Slogan } from "@/lib/design/styles";
import type { TrendingSlogan } from "@prisma/client";
import { sloganHeat } from "@/lib/signals";

/** Trending slogan ids start with this; library ids never do. */
export const TRENDING_PREFIX = "t-";

/**
 * A library slogan, or a trending one that hasn't been hidden. Expired trending
 * slogans still resolve so carts and paid orders keep printing them.
 */
export async function findSlogan(id: string | null | undefined): Promise<Slogan | null> {
  if (!id) return null;
  const lib = SLOGANS.find((s) => s.id === id);
  if (lib) return lib;
  if (!id.startsWith(TRENDING_PREFIX)) return null;
  const t = await prisma.trendingSlogan.findUnique({ where: { id } }).catch(() => null);
  return t && !t.hidden ? { id: t.id, lines: t.lines } : null;
}

export async function resolveSlogan(id: string | null | undefined): Promise<Slogan> {
  return (await findSlogan(id ?? DEFAULT_SLOGAN)) ?? getSlogan(DEFAULT_SLOGAN);
}

/**
 * Live trending slogans, hottest first (writer score plus shopper and X
 * signals). `withPinned` adds proven sellers that have expired, for the studio.
 * Empty (not an error) when the DB is unreachable.
 */
export async function getTrending(limit = 12, withPinned = false): Promise<TrendingSlogan[]> {
  const live = { expiresAt: { gt: new Date() } };
  const rows = await prisma.trendingSlogan
    .findMany({ where: { hidden: false, ...(withPinned ? { OR: [live, { pinned: true }] } : live) } })
    .catch(() => [] as TrendingSlogan[]);
  return rows.sort((a, b) => sloganHeat(b) - sloganHeat(a)).slice(0, limit);
}
