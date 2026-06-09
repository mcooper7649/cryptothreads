import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { previewDesign } from "@/lib/generate";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().min(1).max(128),
  mode: z.enum(["STYLIZED", "EXACT"]).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  try {
    const result = await previewDesign(parsed.data.q, parsed.data.mode ?? "STYLIZED");
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/design/preview]", err);
    return NextResponse.json(
      { error: "preview failed", message: err?.message },
      { status: 500 }
    );
  }
}
