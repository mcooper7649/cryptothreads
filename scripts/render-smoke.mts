/**
 * P2 smoke test: resolve real logos straight from the network (no DB) and run
 * them through the render pipeline, writing print files + previews to /tmp.
 *   npx tsx scripts/render-smoke.mts
 */
import { writeFile } from "fs/promises";
import { renderPrintFile } from "../src/lib/design/render";

async function fetchBuf(url: string): Promise<Buffer> {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  // Vector logo (cryptoicons) -> stylized
  const btcSvg = await fetchBuf(
    "https://raw.githubusercontent.com/Cryptofonts/cryptoicons/master/SVG/btc.svg"
  );
  const btc = await renderPrintFile({
    logoData: btcSvg,
    isVector: true,
    ticker: "BTC",
    name: "Bitcoin",
    tagline: "magic internet money",
    mode: "STYLIZED",
  });
  await writeFile("/tmp/btc-print.png", btc.printPng);
  await writeFile("/tmp/btc-preview.png", btc.previewPng);
  console.log("BTC stylized:", btc.width + "x" + btc.height, "accent", btc.accent,
    "print", btc.printPng.length, "preview", btc.previewPng.length);

  // Raster logo (CoinGecko) -> exact
  const cg = await (await fetch(
    "https://api.coingecko.com/api/v3/coins/uniswap?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false"
  )).json();
  const uniPng = await fetchBuf(cg.image.large.split("?")[0]);
  const uni = await renderPrintFile({
    logoData: uniPng,
    isVector: false,
    ticker: "UNI",
    name: "Uniswap",
    mode: "EXACT",
  });
  await writeFile("/tmp/uni-print.png", uni.printPng);
  console.log("UNI exact:", uni.width + "x" + uni.height, "accent", uni.accent,
    "print", uni.printPng.length);

  // Text-only fallback (no logo found)
  const txt = await renderPrintFile({ ticker: "WIF", name: "dogwifhat", mode: "STYLIZED" });
  await writeFile("/tmp/wif-print.png", txt.printPng);
  console.log("WIF text-only:", txt.width + "x" + txt.height, "print", txt.printPng.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
