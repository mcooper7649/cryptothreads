import { prisma } from "@/lib/db";
import type { Product, Design, LogoCache, ContentPost } from "@prisma/client";

export type ProductWithDesign = Product & { design: Design & { logo: LogoCache } };

/**
 * Storefront read helpers. Each swallows DB errors and returns an empty/null
 * fallback so the site still renders (empty state) before the DB is wired up.
 */

export async function getActiveProducts(limit = 24): Promise<ProductWithDesign[]> {
  try {
    return await prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: { design: { include: { logo: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
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
