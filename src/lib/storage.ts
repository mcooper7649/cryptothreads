import { promises as fs } from "fs";
import path from "path";
import { siteUrl } from "@/lib/store-config";

/**
 * Storage abstraction. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise writes to a local directory (STORAGE_DIR, a Docker volume when
 * self-hosted) that the /cache/[...key] route serves.
 *
 * Printful downloads print files by URL, so when SITE_URL is a
 * public https origin, local assets get absolute URLs on that origin.
 */

export interface StoredAsset {
  key: string;
  url: string;
}

export const LOCAL_DIR = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), ".data", "cache"));
const LOCAL_PREFIX = "/cache";

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function publicOrigin(): string {
  const site = siteUrl();
  return site.startsWith("https://") ? site : "";
}

/** Resolve a storage key to a path inside LOCAL_DIR, refusing traversal. */
export function localPath(key: string): string | null {
  const p = path.resolve(LOCAL_DIR, key);
  return p.startsWith(LOCAL_DIR + path.sep) ? p : null;
}

export async function putAsset(
  key: string,
  data: Buffer,
  contentType: string
): Promise<StoredAsset> {
  if (hasBlob()) {
    // Dynamic import so local dev doesn't require the token at module load.
    const { put } = await import("@vercel/blob");
    const res = await put(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { key, url: res.url };
  }

  const filePath = localPath(key);
  if (!filePath) throw new Error(`invalid storage key: ${key}`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return { key, url: `${publicOrigin()}${LOCAL_PREFIX}/${key}` };
}

/** Read stored asset bytes back, given its url + key. Local files are read from disk. */
export async function readAsset(assetUrl: string, key: string): Promise<Buffer> {
  const local = key ? localPath(key) : null;
  if (local) {
    try {
      return await fs.readFile(local);
    } catch {
      // Not on this disk (e.g. stored in Blob); fall through to fetch.
    }
  }
  if (/^https?:\/\//.test(assetUrl)) {
    const res = await fetch(assetUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`readAsset fetch ${res.status} ${assetUrl}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`asset not found: ${key}`);
}
