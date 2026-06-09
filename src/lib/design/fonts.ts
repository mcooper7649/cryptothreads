import { readFileSync } from "fs";
import path from "path";

/** Satori font descriptor. */
export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 700 | 900;
  style: "normal";
}

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

let cache: SatoriFont[] | null = null;

/** Load + memoize the bundled fonts used by the design templates. */
export function getFonts(): SatoriFont[] {
  if (cache) return cache;
  cache = [
    {
      name: "Archivo Black",
      data: readFileSync(path.join(FONT_DIR, "ArchivoBlack-Regular.ttf")),
      weight: 900,
      style: "normal",
    },
    {
      name: "Roboto",
      data: readFileSync(path.join(FONT_DIR, "Roboto-Regular.ttf")),
      weight: 400,
      style: "normal",
    },
    {
      name: "Roboto",
      data: readFileSync(path.join(FONT_DIR, "Roboto-Bold.ttf")),
      weight: 700,
      style: "normal",
    },
  ];
  return cache;
}
