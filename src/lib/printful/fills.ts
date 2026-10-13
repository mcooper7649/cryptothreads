import sharp from "sharp";
import { createHash } from "crypto";
import { putAsset } from "@/lib/storage";
import { uploadFile } from "./files";
import type { BlankConfig } from "./blanks";
import type { ExtraPlacement } from "./mockups";

const DPI = 150;
const BLACK = "#0b0b0b";
const cache = new Map<string, number>();

/**
 * Solid black print files for a blank's extra panels, uploaded to Printful once
 * per process and reused (same URL, same content: Printful dedupes them anyway).
 */
export async function fillPlacements(blank: BlankConfig): Promise<ExtraPlacement[]> {
  const out: ExtraPlacement[] = [];
  for (const f of blank.fills ?? []) {
    const [w, h] = [Math.round(f.w * DPI), Math.round(f.h * DPI)];
    const key = `fills/black-${w}x${h}.png`;
    let id = cache.get(key);
    if (!id) {
      const png = await sharp({ create: { width: w, height: h, channels: 3, background: BLACK } }).png().toBuffer();
      const stored = await putAsset(key, png, "image/png");
      const v = createHash("sha1").update(png).digest("hex").slice(0, 12);
      id = (await uploadFile(`${stored.url}?v=${v}`, `black-${w}x${h}.png`)).id;
      cache.set(key, id);
    }
    out.push({ placement: f.placement, technique: blank.technique, fileId: id });
  }
  return out;
}
