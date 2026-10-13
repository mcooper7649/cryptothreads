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
  const f = (name: string, file: string, weight: SatoriFont["weight"]): SatoriFont => ({
    name,
    data: readFileSync(path.join(FONT_DIR, file)),
    weight,
    style: "normal",
  });
  cache = [
    f("Anton", "Anton-Regular.ttf", 400),
    f("Press Start 2P", "PressStart2P-Regular.ttf", 400),
    f("IBM Plex Mono", "IBMPlexMono-Regular.ttf", 400),
    f("IBM Plex Mono", "IBMPlexMono-Bold.ttf", 700),
    f("Permanent Marker", "PermanentMarker-Regular.ttf", 400),
    f("Pirata One", "PirataOne-Regular.ttf", 400),
    f("VT323", "VT323-Regular.ttf", 400),
    f("Monoton", "Monoton-Regular.ttf", 400),
    f("Abril Fatface", "AbrilFatface-Regular.ttf", 400),
    f("Cinzel Decorative", "CinzelDecorative-Bold.ttf", 700),
    f("Londrina Solid", "LondrinaSolid-Black.ttf", 900),
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
