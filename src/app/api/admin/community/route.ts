import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { promote } from "@/lib/community";
import { disableSloganProducts } from "@/lib/productize";

export const runtime = "nodejs";

/** Every community submission from the last 30 days, hidden ones included. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const entries = await prisma.submission.findMany({
    where: { createdAt: { gt: new Date(Date.now() - 30 * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, lines: true, ticker: true, votes: true, status: true, sloganId: true, createdAt: true },
  });
  return NextResponse.json({ entries });
}

const Patch = z.object({ id: z.string().min(1).max(40), action: z.enum(["hide", "unhide", "promote"]) });

/** Hide/unhide a submission, or print it now without waiting for votes. */
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { id, action } = parsed.data;
  if (action === "promote") {
    const sloganId = await promote(id);
    return sloganId ? NextResponse.json({ sloganId }) : NextResponse.json({ error: "couldn't promote" }, { status: 409 });
  }
  const entry = await prisma.submission
    .update({ where: { id }, data: { status: action === "hide" ? "HIDDEN" : "LIVE" } })
    .catch(() => null);
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Hiding a promoted idea also pulls its printed slogan.
  if (action === "hide" && entry.sloganId) {
    await prisma.trendingSlogan.updateMany({ where: { id: entry.sloganId }, data: { hidden: true } });
    await disableSloganProducts(entry.sloganId);
  }
  return NextResponse.json({ entry });
}
