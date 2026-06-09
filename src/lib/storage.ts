import { promises as fs } from "fs";
import path from "path";

/**
 * Storage abstraction. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set
 * (production), otherwise writes to public/cache for local dev so the whole
 * pipeline is runnable without cloud credentials.
 */

export interface StoredAsset {
  key: string;
  url: string;
}

const LOCAL_DIR = path.join(process.cwd(), "public", "cache");
const LOCAL_PREFIX = "/cache";

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
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

  const filePath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return { key, url: `${LOCAL_PREFIX}/${key}` };
}
