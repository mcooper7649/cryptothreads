import sharp from "sharp";

function hex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export interface Palette {
  accent: string; // dominant non-neutral color
  fg: string; // readable text color given the accent
}

/**
 * Derive a single accent color from a logo PNG (sharp's dominant-color stat),
 * plus a foreground that reads against it. Cheap and good enough for templating.
 */
export async function extractPalette(png: Buffer): Promise<Palette> {
  try {
    const { dominant } = await sharp(png).stats();
    let { r, g, b } = dominant;
    // Prints go on black garments, so a dark accent (common for logos on a
    // transparent background) would vanish. Tint toward white until it reads.
    for (let t = 0; t < 10 && luminance(r, g, b) < 0.45; t++) {
      r += (255 - r) * 0.2;
      g += (255 - g) * 0.2;
      b += (255 - b) * 0.2;
    }
    const accent = hex(r, g, b);
    const fg = luminance(r, g, b) > 0.6 ? "#0b0b0f" : "#ffffff";
    return { accent, fg };
  } catch {
    return { accent: "#6c5ce7", fg: "#ffffff" };
  }
}
