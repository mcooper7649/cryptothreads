import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { abs } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Share link for a trending slogan (what @FloorFeed posts): its tee once the
 * product is built, the studio preset until then. Links stay good either way.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const t = await prisma.trendingSlogan.findUnique({ where: { id: params.id } });
  if (!t || t.hidden) return NextResponse.redirect(abs("/shop"), 302);
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", design: { slogan: t.id } },
    select: { slug: true, blankType: true },
  });
  const pick = products.find((p) => p.blankType === "tee") ?? products[0];
  const to = pick
    ? `/product/${pick.slug}`
    : `/generate?q=${encodeURIComponent(t.ticker)}&style=${encodeURIComponent(t.style)}&slogan=${encodeURIComponent(t.id)}`;
  return NextResponse.redirect(abs(to), 302);
}
