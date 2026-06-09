import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveLogo } from "@/lib/logo/resolve";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().min(1).max(128),
  force: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q, force } = parsed.data;
  const started = Date.now();
  const logo = await resolveLogo(q, { force });

  if (!logo) {
    return NextResponse.json(
      { found: false, query: q, ms: Date.now() - started },
      { status: 404 }
    );
  }

  return NextResponse.json({
    found: true,
    query: q,
    ms: Date.now() - started,
    logo,
  });
}
