import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED"]),
});

/** Kill-switch / publish toggle for a product (IP takedown -> DISABLED). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const product = await prisma.product.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ product });
}
