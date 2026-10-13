import { prisma } from "@/lib/db";

/**
 * Drops: one numbered post per collector run that published new memes, linking
 * each new design to its products. Shown at /blog ("Drops") and counted by the
 * home badge.
 */

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export interface DropInput {
  title: string;
  intro: string;
  sloganIds: string[];
  publishedAt?: Date;
}

/** Create the drop, unless fewer than two of its slogans have live products yet. */
export async function createDrop(d: DropInput) {
  const slogans = await prisma.trendingSlogan.findMany({ where: { id: { in: d.sloganIds }, hidden: false } });
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", design: { slogan: { in: slogans.map((s) => s.id) } } },
    select: { id: true, design: { select: { slogan: true } } },
  });
  const withProducts = slogans.filter((s) => products.some((p) => p.design.slogan === s.id));
  if (withProducts.length < 2) return null;
  // Keep the writer's order (best first).
  const order = new Map(d.sloganIds.map((id, i) => [id, i]));
  withProducts.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));

  const n = (await prisma.contentPost.count()) + 1;
  const num = String(n).padStart(3, "0");
  const intro = d.intro.trim();
  return prisma.contentPost.create({
    data: {
      slug: `drop-${num}-${slugify(d.title)}`,
      title: d.title.trim(),
      excerpt: intro.split(/(?<=[.!?])\s/)[0].slice(0, 200),
      bodyMdx: intro,
      coinRefs: Array.from(new Set(withProducts.map((s) => s.ticker))),
      productIds: products.filter((p) => withProducts.some((s) => s.id === p.design.slogan)).map((p) => p.id),
      sloganIds: withProducts.map((s) => s.id),
      coverUrl: withProducts[0].previewUrl,
      ...(d.publishedAt ? { publishedAt: d.publishedAt } : {}),
    },
  });
}
