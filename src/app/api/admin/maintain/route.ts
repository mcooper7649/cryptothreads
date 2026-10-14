import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { expireAbandonedCheckouts, pinAndPrune, recordLikes, retireDeadCoins, syncEvents } from "@/lib/maintenance";
import { promotePending } from "@/lib/community";

export const runtime = "nodejs";

const Body = z.object({
  likes: z.array(z.object({ id: z.string().max(64), likes: z.number().int().min(0), tweetUrl: z.string().url().nullish() })).max(50).default([]),
});

/**
 * Freshness pass, run by the trend collector after each collection: X likes in,
 * event designs up, proven sellers pinned, duds ended, dead coins retired,
 * voted community ideas printed, abandoned checkouts closed. Each step reports on its own so one failing
 * (CoinGecko down) doesn't block the rest.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const step = async <T,>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (e) {
      return { error: (e as Error).message };
    }
  };
  return NextResponse.json({
    likes: await step(() => recordLikes(parsed.data.likes)),
    events: await step(() => syncEvents()),
    pins: await step(() => pinAndPrune()),
    coins: await step(() => retireDeadCoins()),
    community: await step(() => promotePending()),
    checkouts: await step(() => expireAbandonedCheckouts()),
  });
}
