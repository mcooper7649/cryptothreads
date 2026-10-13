import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { productizeTrending, retireTrendProducts } from "@/lib/productize";

export const runtime = "nodejs";

let running = false;

/**
 * Turn the hottest trending memes into products and retire trend products that
 * didn't catch on. Printful mockups take ~30-60s each, so `?async=1` (what the
 * collector uses) starts the job and returns 202; one job runs at a time.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(30, Math.max(0, Number(req.nextUrl.searchParams.get("limit") ?? 12)));
  if (running) return NextResponse.json({ error: "already running" }, { status: 409 });
  const job = async () => {
    running = true;
    try {
      const retired = await retireTrendProducts().catch((e) => ({ error: (e as Error).message }));
      const made = await productizeTrending(limit);
      console.log("[productize]", JSON.stringify({ ...made, retired }));
      return { ...made, retired };
    } finally {
      running = false;
    }
  };
  if (req.nextUrl.searchParams.get("async") === "1") {
    void job();
    return NextResponse.json({ started: true, limit }, { status: 202 });
  }
  return NextResponse.json(await job());
}
