/**
 * Renders the storefront's showcase art with the real print engine:
 *   public/brand/style-<id>.png   one example per print style (style picker, home page)
 *   public/brand/sticker-<n>.png  stickers for the sticker-bombed hero
 *   public/brand/meme-<n>.png     the "on the timeline" designs (src/lib/timeline.ts)
 *   npx tsx scripts/brand-assets.mts
 */
import { mkdir, writeFile } from "fs/promises";
import sharp from "sharp";
import { renderPrintFile } from "../src/lib/design/render";
import type { StyleId } from "../src/lib/design/styles";
import { TIMELINE } from "../src/lib/timeline";

const icon = (t: string) => `https://raw.githubusercontent.com/Cryptofonts/cryptoicons/master/SVG/${t}.svg`;
const cache = new Map<string, Buffer>();
async function logo(t: string) {
  if (!cache.has(t)) {
    const r = await fetch(icon(t.toLowerCase()));
    if (!r.ok) throw new Error(`${r.status} ${t}`);
    cache.set(t, Buffer.from(await r.arrayBuffer()));
  }
  return cache.get(t)!;
}

const showcase: [StyleId, string, string][] = [
  ["ticker", "BTC", "hodl"],
  ["box", "SOL", "lfg"],
  ["slogan", "DOGE", "such-wow"],
  ["chart", "ETH", "up-only"],
  ["receipt", "LINK", "down-bad"],
  ["stamp", "BTC", "diamond-hands"],
  ["pixel", "AVAX", "wen-moon"],
  ["gothic", "SOL", "down-bad"],
  ["warning", "BTC", "exit-liquidity"],
  ["headline", "ETH", "crypto-is-back"],
  ["vapor", "SOL", "sol-summer"],
  ["terminal", "BTC", "few-understand"],
  ["tarot", "DOGE", "diamond-hands"],
  ["nouns", "ETH", "gm"],
  ["art-scream", "BTC", "this-is-fine"],
  ["art-monalisa", "BTC", "hodl"],
  ["art-wave", "ETH", "buy-the-dip"],
  ["art-napoleon", "BTC", "stack-sats"],
  ["art-adam", "ETH", "gm"],
  ["art-liberty", "SOL", "lfg"],
  ["art-socrates", "BTC", "exit-liquidity"],
  ["art-harvesters", "SOL", "still-early"],
  ["art-delaware", "BTC", "wagmi"],
  ["art-pearl", "ETH", "down-bad"],
  ["art-starry", "SOL", "wen-moon"],
];
const stickers: [StyleId, string, string][] = [
  ["slogan", "BTC", "one-btc"],
  ["box", "DOGE", "wagmi"],
  ["stamp", "ETH", "ultrasound"],
  ["slogan", "SOL", "ser"],
  ["pixel", "BTC", "gm"],
  ["slogan", "ETH", "crypto-is-back"],
  ["box", "XRP", "xrp-army"],
  ["slogan", "DOGE", "find-a-meme"],
];

async function main() {
  await mkdir("public/brand", { recursive: true });
  for (const [style, t, slogan] of showcase) {
    const r = await renderPrintFile({ logoData: await logo(t), isVector: true, ticker: t, style, slogan, previewOnly: true });
    await writeFile(`public/brand/style-${style}.png`, await sharp(r.previewPng).png({ compressionLevel: 9, palette: true }).toBuffer());
  }
  for (const [i, [style, t, slogan]] of stickers.entries()) {
    const r = await renderPrintFile({ logoData: await logo(t), isVector: true, ticker: t, style, slogan, format: "sticker", previewOnly: true });
    await writeFile(`public/brand/sticker-${i}.png`, await sharp(r.previewPng).resize(420).png({ compressionLevel: 9, palette: true }).toBuffer());
  }
  for (const [i, { style, ticker: t, slogan }] of TIMELINE.entries()) {
    const r = await renderPrintFile({ logoData: await logo(t), isVector: true, ticker: t, style, slogan, previewOnly: true });
    await writeFile(`public/brand/meme-${i}.png`, await sharp(r.previewPng).resize(600).png({ compressionLevel: 9, palette: true }).toBuffer());
  }
  console.log("brand assets written");
}
main().catch((e) => { console.error(e); process.exit(1); });
