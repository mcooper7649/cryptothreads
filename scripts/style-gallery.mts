/**
 * Renders every print style for a few coins onto black (garment color) and
 * writes one contact sheet, for eyeballing design changes without a database.
 *   npx tsx scripts/style-gallery.mts [outDir]
 */
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";
import { renderPrintFile } from "../src/lib/design/render";
import { STYLES, slogansFor } from "../src/lib/design/styles";

const out = process.argv[2] || "/tmp/ct-gallery";

async function fetchBuf(url: string): Promise<Buffer> {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

const coins = [
  { ticker: "BTC", name: "Bitcoin", logo: "https://raw.githubusercontent.com/Cryptofonts/cryptoicons/master/SVG/btc.svg", vector: true },
  { ticker: "DOGE", name: "Dogecoin", logo: "https://raw.githubusercontent.com/Cryptofonts/cryptoicons/master/SVG/doge.svg", vector: true },
  { ticker: "WIF", name: undefined, logo: undefined, vector: false },
];

async function main() {
  await mkdir(out, { recursive: true });
  const tiles: Buffer[] = [];
  for (const c of coins) {
    const logoData = c.logo ? await fetchBuf(c.logo) : undefined;
    const slogans = slogansFor(c.ticker);
    for (const [i, s] of STYLES.entries()) {
      const r = await renderPrintFile({
        logoData, isVector: c.vector, ticker: c.ticker, name: c.name,
        mode: "STYLIZED", style: s.id, slogan: slogans[(i * 3) % slogans.length].id, previewOnly: true,
      });
      tiles.push(await sharp({ create: { width: 900, height: 1080, channels: 4, background: "#141414" } })
        .composite([{ input: r.previewPng }]).png().toBuffer());
    }
    const st = await renderPrintFile({ logoData, isVector: c.vector, ticker: c.ticker, style: "slogan", slogan: slogans[0].id, format: "sticker", previewOnly: true });
    tiles.push(await sharp({ create: { width: 900, height: 1080, channels: 4, background: "#e8e8e8" } })
      .composite([{ input: st.previewPng, gravity: "center" }]).png().toBuffer());
  }
  const cols = STYLES.length + 1, tw = 450, th = 540;
  const small = await Promise.all(tiles.map((t) => sharp(t).resize(tw, th).png().toBuffer()));
  const sheet = await sharp({ create: { width: cols * tw, height: Math.ceil(small.length / cols) * th, channels: 4, background: "#000" } })
    .composite(small.map((input, i) => ({ input, left: (i % cols) * tw, top: Math.floor(i / cols) * th })))
    .png().toBuffer();
  await writeFile(`${out}/sheet.png`, sheet);
  console.log("wrote", `${out}/sheet.png`, tiles.length, "tiles");
}
main().catch((e) => { console.error(e); process.exit(1); });
