import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { getFonts } from "./fonts";
import { rasterizeLogo } from "./logo-raster";
import { extractPalette } from "./palette";
import { TEMPLATES, TemplateName, TemplateProps } from "./templates";

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

function templateName(mode: RenderInput["mode"]): TemplateName {
  return mode === "EXACT" ? "exact" : "stylized";
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
    fg,
  };

  const element = TEMPLATES[templateName(input.mode)](props);

  const svg = await satori(element, {
    width: PRINT_W,
    height: PRINT_H,
    fonts: getFonts(),
  });

  if (input.previewOnly) {
    const previewPng = Buffer.from(
      new Resvg(svg, { fitTo: { mode: "width", value: PREVIEW_W }, background: "rgba(0,0,0,0)" })
        .render()
        .asPng()
    );
    return { printPng: Buffer.alloc(0), previewPng, width: PRINT_W, height: PRINT_H, accent };
  }

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: PRINT_W },
    background: "rgba(0,0,0,0)",
  });
  const printPng = Buffer.from(resvg.render().asPng());

  const previewPng = await sharp(printPng)
    .resize({ width: PREVIEW_W, fit: "inside" })
    .png()
    .toBuffer();

  return { printPng, previewPng, width: PRINT_W, height: PRINT_H, accent };
}
