import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { z } from "zod";
import { productizeTrending, retireTrendProducts } from "@/lib/productize";
import { createDrop } from "@/lib/drops";

export const runtime = "nodejs";

let running = false;

/**
 * Turn the hottest trending memes into products and retire trend products that
 * didn't catch on. Printful mockups take ~30-60s each, so `?async=1` (what the
 * collector uses) starts the job and returns 202; one job runs at a time.
 * With a `drop` body, the run's new slogans are published as a drop once their
 * products exist.
 */
const Body = z.object({
  drop: z.object({ title: z.string().min(3).max(90), intro: z.string().min(10).max(700) }).optional(),
  sloganIds: z.array(z.string().max(64)).max(30).default([]),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(30, Math.max(0, Number(req.nextUrl.searchParams.get("limit") ?? 12)));
  if (running) return NextResponse.json({ error: "already running" }, { status: 409 });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  const drop = body.success && body.data.drop ? { ...body.data.drop, sloganIds: body.data.sloganIds } : null;
  const job = async () => {
    running = true;
    try {
      const retired = await retireTrendProducts().catch((e) => ({ error: (e as Error).message }));
      const made = await productizeTrending(limit);
      const post = drop ? await createDrop(drop).catch((e) => (console.error("[drop]", e), null)) : null;
      console.log("[productize]", JSON.stringify({ ...made, retired, drop: post?.slug ?? null }));
      return { ...made, retired, drop: post?.slug ?? null };
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
