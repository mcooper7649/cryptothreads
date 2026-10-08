import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { previewDesign, type PreviewResult } from "@/lib/generate";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().trim().min(1).max(128),
  mode: z.enum(["STYLIZED", "EXACT"]).optional(),
});

// Recent previews, so retyping a ticker or several shoppers trying "BTC" cost one render.
const cache = new Map<string, PreviewResult>();
const CACHE_MAX = 200;

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  const mode = parsed.data.mode ?? "STYLIZED";
  const key = `${mode}:${parsed.data.q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit);

  if (!allow(`preview:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "rate limited", message: "Too many previews in a minute. Wait a moment and try again." },
      { status: 429 }
    );
  }

  try {
    const result = await previewDesign(parsed.data.q, mode);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/design/preview]", err);
    return NextResponse.json(
      { error: "preview failed", message: "Couldn't build a preview for that. Try a ticker like BTC or a project website." },
      { status: 500 }
    );
  }
}
