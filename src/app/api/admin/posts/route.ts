import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

const Body = z.object({
  title: z.string().min(1).max(160),
  slug: z.string().optional(),
  excerpt: z.string().max(400).optional(),
  bodyMdx: z.string().min(1),
  coinRefs: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const baseSlug = b.slug ? slugify(b.slug) : slugify(b.title);

  for (let attempt = 0; ; attempt++) {
    try {
      const post = await prisma.contentPost.create({
        data: {
          title: b.title,
          slug: attempt ? `${baseSlug}-${attempt}` : baseSlug,
          excerpt: b.excerpt,
          bodyMdx: b.bodyMdx,
          coinRefs: b.coinRefs ?? [],
          productIds: b.productIds ?? [],
        },
      });
      return NextResponse.json({ post });
    } catch (e: any) {
      if (e?.code === "P2002" && attempt < 5) continue;
      console.error("[/api/admin/posts]", e);
      return NextResponse.json({ error: "create failed", message: e?.message }, { status: 500 });
    }
  }
}
