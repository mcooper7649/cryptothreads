import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

/**
 * Simple bearer-token guard for admin/generation endpoints during early build.
 * Set ADMIN_TOKEN in env; send as `Authorization: Bearer <token>` or
 * `x-admin-token: <token>`. Replace with real auth before public launch.
 */
export function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const header = req.headers.get("x-admin-token") ?? undefined;
  const given = bearer ?? header;
  if (!given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
