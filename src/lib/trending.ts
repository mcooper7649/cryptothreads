/** CoinGecko trending coins (top-7 searched in the last 24h). */
const BASE = "https://api.coingecko.com/api/v3";

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  rank?: number;
}

function headers(): HeadersInit {
  const key = process.env.COINGECKO_DEMO_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

export async function getTrendingCoins(limit = 5): Promise<TrendingCoin[]> {
  const res = await fetch(`${BASE}/search/trending`, { headers: headers() });
  if (!res.ok) throw new Error(`coingecko trending ${res.status}`);
  const data = await res.json();
  const coins: any[] = data?.coins ?? [];
  return coins.slice(0, limit).map((c) => ({
    id: c.item.id,
    symbol: (c.item.symbol || "").toUpperCase(),
    name: c.item.name,
    rank: c.item.market_cap_rank ?? undefined,
  }));
}
