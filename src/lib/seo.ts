import { siteUrl } from "@/lib/store-config";

/** Absolute URL on the current site (SITE_URL), for canonicals, sitemaps and JSON-LD. */
export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

/**
 * Stored asset URLs carry whatever host SITE_URL was when they were made; for
 * share cards and structured data, point them at the current site instead.
 */
export const onSite = (url: string | null | undefined) => (url ? abs(url.replace(/^https?:\/\/[^/]+/, "")) : undefined);

export const SITE_NAME = "CryptoThreads";

/** Product structured data needs plain dollars, not cents. */
export const dollars = (cents: number) => (cents / 100).toFixed(2);

/** Full names for coins whose logo source has none; search traffic uses the name ("dogecoin shirt"). */
const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", DOGE: "Dogecoin", XRP: "XRP", PEPE: "Pepe", WIF: "dogwifhat",
  LINK: "Chainlink", SHIB: "Shiba Inu", BONK: "Bonk", ADA: "Cardano", AVAX: "Avalanche", SUI: "Sui", TON: "Toncoin",
  LTC: "Litecoin", BNB: "BNB", TRX: "TRON", ZEC: "Zcash", STRK: "Starknet", HYPE: "Hyperliquid",
};

export const coinDisplayName = (symbol: string, logoName?: string | null) =>
  (logoName && logoName.toUpperCase() !== symbol.toUpperCase() ? logoName : null) ?? COIN_NAMES[symbol.toUpperCase()] ?? null;
