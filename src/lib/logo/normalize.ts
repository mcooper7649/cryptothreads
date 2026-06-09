import { NormalizedQuery } from "./types";

/**
 * Classify a raw input into a query kind and pull out whatever identity hints
 * we can. Inputs we expect:
 *   - "https://uniswap.org" / "uniswap.org"  -> domain
 *   - "UNI" / "btc"                          -> symbol
 *   - "uniswap" (coingecko id)               -> coingeckoId (ambiguous w/ symbol)
 */
export function normalizeQuery(raw: string): NormalizedQuery {
  const trimmed = raw.trim();

  // URL or bare domain?
  let domain: string | undefined;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes(".")) domain = url.hostname.replace(/^www\./, "");
  } catch {
    /* not a URL */
  }

  if (domain && /\.[a-z]{2,}$/i.test(domain)) {
    return { raw: trimmed, kind: "domain", domain };
  }

  // Short, all-letters/digits with no dot => treat as ticker symbol.
  if (/^[a-z0-9]{1,12}$/i.test(trimmed)) {
    // Heuristic: <=6 chars looks like a ticker; longer looks like a slug/id.
    if (trimmed.length <= 6) {
      return { raw: trimmed, kind: "symbol", symbol: trimmed.toUpperCase() };
    }
    return {
      raw: trimmed,
      kind: "coingeckoId",
      coingeckoId: trimmed.toLowerCase(),
      symbol: trimmed.toUpperCase(),
    };
  }

  // Fallback: lowercase slug as coingecko id.
  return {
    raw: trimmed,
    kind: "coingeckoId",
    coingeckoId: trimmed.toLowerCase().replace(/\s+/g, "-"),
  };
}
