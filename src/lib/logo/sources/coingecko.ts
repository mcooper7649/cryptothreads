import { NormalizedQuery, SourceResult } from "../types";

/**
 * CoinGecko — last-resort source. Logos here are small raster PNGs (~250px),
 * so this only wins when no vector exists upstream. Also our best source of
 * canonical name/symbol/coingeckoId metadata.
 * Demo API key: header x-cg-demo-api-key, 30 calls/min.
 */
const BASE = "https://api.coingecko.com/api/v3";

function headers(): HeadersInit {
  const key = process.env.COINGECKO_DEMO_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

interface CoinMeta {
  id: string;
  symbol: string;
  name: string;
  image: string;
}

async function resolveCoinMeta(q: NormalizedQuery): Promise<CoinMeta | null> {
  // 1) Direct id lookup when we have a plausible coingecko id.
  if (q.coingeckoId) {
    try {
      const res = await fetch(
        `${BASE}/coins/${q.coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
        { headers: headers() }
      );
      if (res.ok) {
        const d = await res.json();
        const image = d?.image?.large || d?.image?.small;
        if (image) return { id: d.id, symbol: d.symbol, name: d.name, image };
      }
    } catch {
      /* fall through to search */
    }
  }

  // 2) Search by symbol/name.
  const term = q.symbol || q.coingeckoId || q.raw;
  try {
    const res = await fetch(`${BASE}/search?query=${encodeURIComponent(term)}`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const coins: any[] = d?.coins || [];
    if (!coins.length) return null;
    // Prefer exact symbol match, else first (CoinGecko ranks by market cap).
    const match =
      (q.symbol &&
        coins.find((c) => c.symbol?.toUpperCase() === q.symbol)) ||
      coins[0];
    const image = match.large || match.thumb;
    if (!image) return null;
    return { id: match.id, symbol: match.symbol, name: match.name, image };
  } catch {
    return null;
  }
}

export async function fromCoinGecko(
  q: NormalizedQuery
): Promise<SourceResult | null> {
  const meta = await resolveCoinMeta(q);
  if (!meta) return null;
  try {
    // CoinGecko image URLs carry a cache-buster query; strip for a clean fetch.
    const imgUrl = meta.image.split("?")[0];
    const res = await fetch(imgUrl, { redirect: "follow" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      source: "coingecko",
      data: buf,
      contentType,
      isVector: /svg/.test(contentType),
      name: meta.name,
      symbol: meta.symbol?.toUpperCase(),
      coingeckoId: meta.id,
    };
  } catch {
    return null;
  }
}
