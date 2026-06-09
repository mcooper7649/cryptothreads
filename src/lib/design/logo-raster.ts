import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

export interface RasterLogo {
  png: Buffer;
  width: number;
  height: number;
}

/**
 * Normalize any logo (vector or raster) into a transparent, high-res PNG.
 * Vector -> resvg at `target` px wide (crisp at any print size).
 * Raster -> sharp contain-fit up to `target` (no upscaling past source for
 * quality; small CoinGecko logos stay small and are used as accents only).
 */
export async function rasterizeLogo(
  data: Buffer,
  isVector: boolean,
  target = 1400
): Promise<RasterLogo> {
  if (isVector) {
    const svg = data.toString("utf8");
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: target },
      background: "rgba(0,0,0,0)",
    });
    const rendered = resvg.render();
    const png = Buffer.from(rendered.asPng());
    return { png, width: rendered.width, height: rendered.height };
  }

  const img = sharp(data).ensureAlpha();
  const meta = await img.metadata();
  const srcW = meta.width ?? target;
  const png = await img
    .resize({
      width: Math.min(target, srcW),
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const outMeta = await sharp(png).metadata();
  return { png, width: outMeta.width ?? target, height: outMeta.height ?? target };
}
