import { prisma } from "@/lib/db";
import type { Product, Design, LogoCache, ContentPost } from "@prisma/client";

export type ProductWithDesign = Product & { design: Design & { logo: LogoCache } };

/**
 * Storefront read helpers. Each swallows DB errors and returns an empty/null
 * fallback so the site still renders (empty state) before the DB is wired up.
 */

export interface ProductFilter {
  blankType?: string;
  style?: string;
  coin?: string;
}

export async function getActiveProducts(limit = 24, f: ProductFilter = {}): Promise<ProductWithDesign[]> {
  try {
    return await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(f.blankType ? { blankType: f.blankType } : {}),
        ...(f.style ? { design: { style: f.style } } : {}),
        ...(f.coin ? { query: { equals: f.coin, mode: "insensitive" } } : {}),
      },
      include: { design: { include: { logo: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

/** Coins that have at least one live product, most products first. */
export async function getActiveCoins(): Promise<string[]> {
  try {
    const rows = await prisma.product.groupBy({
      by: ["query"],
      where: { status: "ACTIVE", query: { not: null } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
    });
    return rows.map((r) => (r.query as string).toUpperCase());
  } catch {
    return [];
  }
}

/** Other live products for the same coin, for "more like this". */
export async function getRelatedProducts(p: { id: string; query: string | null }, limit = 4) {
  if (!p.query) return [];
  try {
    return await prisma.product.findMany({
      where: { status: "ACTIVE", query: p.query, id: { not: p.id } },
      include: { design: { include: { logo: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

/** Drop number for the banner: one per published drop post, starting at 001. */
export async function getDropNumber(): Promise<number> {
  try {
    return Math.max(1, await prisma.contentPost.count());
  } catch {
    return 1;
  }
}

export async function getProductBySlug(
  slug: string
): Promise<ProductWithDesign | null> {
  try {
    return await prisma.product.findUnique({
      where: { slug },
      include: { design: { include: { logo: true } } },
    });
  } catch {
    return null;
  }
}

export async function getRecentPosts(limit = 10): Promise<ContentPost[]> {
  try {
    return await prisma.contentPost.findMany({
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<ContentPost | null> {
  try {
    return await prisma.contentPost.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}
