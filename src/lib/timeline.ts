import type { StyleId } from "@/lib/design/styles";

/**
 * Memes lifted from what crypto X was posting, shown on the home page as
 * ready-made designs. Art lives at public/brand/meme-<i>.png and is rendered by
 * scripts/brand-assets.mts, so re-run that script after editing this list.
 */
export const TIMELINE_AS_OF = "October 2026";

export const TIMELINE: { style: StyleId; ticker: string; slogan: string; seen: string }[] = [
  { style: "slogan", ticker: "BTC", slogan: "crypto-is-back", seen: "Everyone said it. Again." },
  { style: "box", ticker: "DOGE", slogan: "find-a-meme", seen: "The memecoin strategy, in full." },
  { style: "receipt", ticker: "SOL", slogan: "dont-ask", seen: "The look, as a receipt." },
  { style: "chart", ticker: "XRP", slogan: "green-candle", seen: "XRP Ledger was trending." },
  { style: "stamp", ticker: "ZEC", slogan: "privacy-normal", seen: "ZEC is back on the timeline." },
  { style: "pixel", ticker: "STRK", slogan: "shill-me", seen: "STRK was trending. Shill us yours." },
];
