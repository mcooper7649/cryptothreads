import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { generateProduct } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 120; // mockup generation can take a while

const Body = z.object({
  query: z.string().min(1).max(128),
  blankType: z.enum(["tee", "hoodie", "mug"]).optional(),
  mode: z.enum(["STYLIZED", "EXACT"]).optional(),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const product = await generateProduct(parsed.data);
    return NextResponse.json({ product });
  } catch (err: any) {
    console.error("[/api/generate]", err);
    return NextResponse.json(
      { error: "generation failed", message: err?.message },
      { status: 500 }
    );
  }
}
