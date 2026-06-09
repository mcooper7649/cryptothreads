import { NormalizedQuery, SourceResult } from "../types";

/**
 * Cryptofonts/cryptoicons — community SVG icon set for major coins.
 * Files live at SVG/{symbol}.svg (lowercase). Vector, so prints cleanly.
 * https://github.com/Cryptofonts/cryptoicons
 */
const BASE =
  process.env.CRYPTOICONS_BASE ||
  "https://raw.githubusercontent.com/Cryptofonts/cryptoicons/master/SVG";

export async function fromCryptoicons(
  q: NormalizedQuery
): Promise<SourceResult | null> {
  if (!q.symbol) return null;
  const sym = q.symbol.toLowerCase();
  const url = `${BASE}/${sym}.svg`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.includes("<svg")) return null;
    return {
      source: "cryptoicons",
      data: Buffer.from(text, "utf8"),
      contentType: "image/svg+xml",
      isVector: true,
      symbol: q.symbol,
      domain: q.domain,
    };
  } catch {
    return null;
  }
}
