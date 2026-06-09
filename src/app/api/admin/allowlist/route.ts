import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const entries = await prisma.allowlist.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

const Body = z
  .object({
    symbol: z.string().min(1).max(16).optional(),
    domain: z.string().min(3).max(120).optional(),
    exactLogoPermitted: z.boolean().default(true),
    notes: z.string().max(400).optional(),
  })
  .refine((b) => b.symbol || b.domain, { message: "symbol or domain required" });

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const entry = await prisma.allowlist.create({
    data: {
      symbol: b.symbol ? b.symbol.toUpperCase() : null,
      domain: b.domain ?? null,
      exactLogoPermitted: b.exactLogoPermitted,
      notes: b.notes,
    },
  });
  return NextResponse.json({ entry });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.allowlist.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
