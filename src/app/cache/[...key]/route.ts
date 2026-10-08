import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { localPath } from "@/lib/storage";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** Serves locally stored assets (logos, previews, print files) from STORAGE_DIR. */
export async function GET(_req: NextRequest, { params }: { params: { key: string[] } }) {
  const file = localPath(params.key.join("/"));
  const type = file && TYPES[path.extname(file).toLowerCase()];
  if (!file || !type) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        // Keys are rewritten in place on regeneration, so cache for a day, not forever.
        "Cache-Control": "public, max-age=86400",
        // Logos can be third-party SVGs; never let them run script on our origin.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
