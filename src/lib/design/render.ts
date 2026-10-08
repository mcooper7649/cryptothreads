import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { getFonts } from "./fonts";
import { rasterizeLogo } from "./logo-raster";
import { extractPalette } from "./palette";
import { TEMPLATES, TemplateName, TemplateProps } from "./templates";
import { DEFAULT_STYLE, getSlogan, type StyleId } from "./styles";

// Printful DTG large print area @ ~300 DPI (15" x 18").
export const PRINT_W = 4500;
export const PRINT_H = 5400;
const PREVIEW_W = 900;

export interface RenderInput {
  logoData?: Buffer; // raw bytes; omit for text-only design
  isVector?: boolean;
  ticker: string;
  name?: string;
  tagline?: string;
  mode?: "STYLIZED" | "EXACT";
  /** Print style for STYLIZED designs (EXACT always prints the logo). */
  style?: StyleId;
  /** Slogan id from the library, for styles that print one. */
  slogan?: string;
  /** "sticker" puts the design on a black rounded square sized for kiss-cut stickers. */
  format?: "apparel" | "sticker";
  accent?: string; // override palette-derived accent
  /** Skip the full-resolution print file and rasterize only the web preview (~25x cheaper). */
  previewOnly?: boolean;
}

export interface RenderOutput {
  printPng: Buffer; // full-res transparent print file (empty when previewOnly)
  previewPng: Buffer; // small web preview
  width: number;
  height: number;
  accent: string;
}

function templateName(input: RenderInput): TemplateName {
  return input.mode === "EXACT" ? "exact" : input.style ?? DEFAULT_STYLE;
}

function onColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? "#0b0b0b" : "#ffffff";
}

const STICKER = 1800; // 5.5" at ~330 DPI; Printful scales down for smaller sizes
const STICKER_BG = "#0b0b0b";

/** Trim the transparent margin, then center the art on a black rounded square. */
async function toSticker(png: Buffer, size: number): Promise<Buffer> {
  const pad = Math.round(size * 0.09);
  const art = await sharp(png)
    .trim({ threshold: 1 })
    .resize({ width: size - pad * 2, height: size - pad * 2, fit: "inside" })
    .png()
    .toBuffer();
  const r = Math.round(size * 0.12);
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${STICKER_BG}"/></svg>`
  );
  return sharp(bg).composite([{ input: art, gravity: "center" }]).png().toBuffer();
}

/** logo (any format) + text -> print-ready transparent PNG + web preview. */
export async function renderPrintFile(input: RenderInput): Promise<RenderOutput> {
  let logoDataUri: string | undefined;
  let logoW = 1;
  let logoH = 1;
  let accent = input.accent ?? "#6c5ce7";
  const fg = "#ffffff";

  if (input.logoData) {
    const raster = await rasterizeLogo(input.logoData, !!input.isVector);
    logoDataUri = `data:image/png;base64,${raster.png.toString("base64")}`;
    logoW = raster.width;
    logoH = raster.height;
    if (!input.accent) {
      const pal = await extractPalette(raster.png);
      accent = pal.accent;
      // fg stays light: print files target dark garments (crypto-merch default).
      // A light-garment variant (pal.fg) can be generated later in product setup.
    }
  }

  const props: TemplateProps = {
    ticker: input.ticker,
    name: input.name,
    tagline: input.tagline,
    logoDataUri,
    logoW,
    logoH,
    accent,
    onAccent: onColor(accent),
    fg,
    slogan: getSlogan(input.slogan).lines,
  };

  const element = TEMPLATES[templateName(input)](props);
  const sticker = input.format === "sticker";

  const svg = await satori(element, {
    width: PRINT_W,
    height: PRINT_H,
    fonts: getFonts(),
  });

  const raster = (width: number) =>
    Buffer.from(
      new Resvg(svg, { fitTo: { mode: "width", value: width }, background: "rgba(0,0,0,0)" })
        .render()
        .asPng()
    );

  if (input.previewOnly) {
    const previewPng = sticker ? await toSticker(raster(PREVIEW_W * 2), PREVIEW_W) : raster(PREVIEW_W);
    const [w, h] = sticker ? [STICKER, STICKER] : [PRINT_W, PRINT_H];
    return { printPng: Buffer.alloc(0), previewPng, width: w, height: h, accent };
  }

  if (sticker) {
    const printPng = await toSticker(raster(STICKER * 1.5), STICKER);
    const previewPng = await sharp(printPng).resize({ width: PREVIEW_W }).png().toBuffer();
    return { printPng, previewPng, width: STICKER, height: STICKER, accent };
  }

  const printPng = raster(PRINT_W);

  const previewPng = await sharp(printPng)
    .resize({ width: PREVIEW_W, fit: "inside" })
    .png()
    .toBuffer();

  return { printPng, previewPng, width: PRINT_W, height: PRINT_H, accent };
}
