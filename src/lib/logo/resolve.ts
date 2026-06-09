import { normalizeQuery } from "./normalize";
import { lookupCache, writeCache } from "./cache";
import { fromBrandfetch } from "./sources/brandfetch";
import { fromCryptoicons } from "./sources/cryptoicons";
import { fromCoinGecko } from "./sources/coingecko";
import { ResolvedLogo, SourceResult, NormalizedQuery } from "./types";

/** Waterfall order: vector sources first, raster CoinGecko last. */
const SOURCES: Array<(q: NormalizedQuery) => Promise<SourceResult | null>> = [
  fromBrandfetch,
  fromCryptoicons,
  fromCoinGecko,
];

export interface ResolveOptions {
  /** Skip the cache and force a fresh waterfall fetch. */
  force?: boolean;
}

/**
 * Run the waterfall only (no DB). Used for live previews where we want the
 * resolved bytes without touching the cache. Returns the first source hit.
 */
export async function fetchLogoFromSources(
  rawQuery: string
): Promise<SourceResult | null> {
  const q = normalizeQuery(rawQuery);
  for (const source of SOURCES) {
    const result = await source(q);
    if (result) return result;
  }
  return null;
}

/**
 * Resolve a coin's logo to a stored, print-ready asset.
 * 1. cache lookup (resolve-once)  2. waterfall  3. store + cache.
 */
export async function resolveLogo(
  rawQuery: string,
  opts: ResolveOptions = {}
): Promise<ResolvedLogo | null> {
  const q = normalizeQuery(rawQuery);

  if (!opts.force) {
    const hit = await lookupCache(q);
    if (hit) return hit;
  }

  for (const source of SOURCES) {
    const result = await source(q);
    if (result) {
      return writeCache(q, result);
    }
  }

  return null; // no logo found — caller falls back to text-only stylized design
}
