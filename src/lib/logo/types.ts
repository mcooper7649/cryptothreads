export interface LogoInput {
  /** Raw user input: a domain, a ticker symbol, a CoinGecko id, or a URL. */
  query: string;
}

export type QueryKind = "domain" | "symbol" | "coingeckoId";

export interface NormalizedQuery {
  raw: string;
  kind: QueryKind;
  /** Best-effort guesses we can cross-check across sources. */
  symbol?: string;
  domain?: string;
  coingeckoId?: string;
}

/** Raw asset returned by a single source before it is stored/cached. */
export interface SourceResult {
  source: "brandfetch" | "cryptoicons" | "coingecko";
  data: Buffer;
  contentType: string;
  isVector: boolean;
  name?: string;
  symbol?: string;
  domain?: string;
  coingeckoId?: string;
  palette?: string[];
}

/** What callers (generation engine, API) receive. */
export interface ResolvedLogo {
  id: string;
  source: string;
  isVector: boolean;
  assetUrl: string;
  assetKey: string;
  contentType: string;
  symbol: string | null;
  domain: string | null;
  coingeckoId: string | null;
  name: string | null;
  palette: string[] | null;
  cached: boolean;
}
