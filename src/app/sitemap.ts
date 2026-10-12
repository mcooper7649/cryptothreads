import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getActiveCoins } from "@/lib/queries";
import { abs } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [products, posts, coins] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, createdAt: true } }).catch(() => []),
    prisma.contentPost.findMany({ select: { slug: true, publishedAt: true } }).catch(() => []),
    getActiveCoins(),
  ]);
  return [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/generate"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/shill"), lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: abs("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    ...coins.map((c) => ({ url: abs(`/coin/${encodeURIComponent(c)}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: abs(`/product/${p.slug}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...posts.map((p) => ({ url: abs(`/blog/${p.slug}`), lastModified: p.publishedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
    { url: abs("/policy/shipping"), changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/policy/ip"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
