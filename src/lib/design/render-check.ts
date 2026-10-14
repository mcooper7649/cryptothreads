import sharp from "sharp";

/**
 * Ink in the outer band of a render means something ran off the canvas (a clipped
 * last line, an overflowing word). No style draws that close to the edge on purpose.
 * `band` is a fraction of the width (0.011 = 10px on a 900px preview).
 */
export async function runsOffEdge(png: Buffer, band = 0.011): Promise<boolean> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const b = Math.max(2, Math.round(w * band));
  for (let y = 0; y < h; y++) {
    const edgeRow = y < b || y >= h - b;
    for (let x = 0; x < w; x++) {
      if (!edgeRow && x >= b && x < w - b) {
        x = w - b - 1; // skip the interior of this row
        continue;
      }
      if (data[(y * w + x) * 4 + 3] > 40) return true;
    }
  }
  return false;
}
