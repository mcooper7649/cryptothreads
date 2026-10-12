import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { productizeTrending, retireTrendProducts } from "@/lib/productize";

export const runtime = "nodejs";
// Printful mockups take ~30-60s each; the collector waits up to 25 minutes.
export const maxDuration = 1500;

/** Turn the hottest new trending memes into tee products, and retire trend products that didn't catch on. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(10, Math.max(0, Number(req.nextUrl.searchParams.get("limit") ?? 6)));
  const retired = await retireTrendProducts().catch((e) => ({ error: (e as Error).message }));
  const made = await productizeTrending(limit);
  return NextResponse.json({ ...made, retired });
}
