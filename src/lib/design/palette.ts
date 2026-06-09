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
  return (0.2126 * r + 0.7152 * g + 0.114 * b) / 255;
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
    const { r, g, b } = dominant;
    const accent = hex(r, g, b);
    const fg = luminance(r, g, b) > 0.6 ? "#0b0b0f" : "#ffffff";
    return { accent, fg };
  } catch {
    return { accent: "#6c5ce7", fg: "#ffffff" };
  }
}
