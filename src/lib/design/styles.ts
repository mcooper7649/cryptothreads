/**
 * Print styles and the meme slogan library. Shared by the render pipeline,
 * the studio UI and the API validators, so it must stay free of server-only imports.
 */

export const STYLES = [
  { id: "ticker", label: "Ticker", blurb: "The coin's ticker, huge, with its logo", slogan: false },
  { id: "box", label: "Box logo", blurb: "Ticker in a solid box, slogan underneath", slogan: true },
  { id: "slogan", label: "Meme", blurb: "A meme slogan, stacked as big as it goes", slogan: true },
  { id: "chart", label: "Pump chart", blurb: "Candles going up and to the right", slogan: true },
  { id: "receipt", label: "Receipt", blurb: "A trade receipt for your bags", slogan: true },
  { id: "stamp", label: "Club stamp", blurb: "A members-only seal with the slogan around the rim", slogan: true },
  { id: "pixel", label: "8-bit", blurb: "Pixel rocket and arcade type", slogan: true },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];
export const DEFAULT_STYLE: StyleId = "ticker";

export interface Slogan {
  id: string;
  /** Lines as printed, top to bottom. */
  lines: string[];
  /** Only offered for these tickers (coin in-jokes). */
  coins?: string[];
}

export const SLOGANS: Slogan[] = [
  { id: "hodl", lines: ["HODL"] },
  { id: "wagmi", lines: ["WAGMI"] },
  { id: "gm", lines: ["GM"] },
  { id: "lfg", lines: ["LFG"] },
  { id: "wen-moon", lines: ["WEN", "MOON"] },
  { id: "number-go-up", lines: ["NUMBER", "GO UP"] },
  { id: "up-only", lines: ["UP", "ONLY"] },
  { id: "buy-the-dip", lines: ["BUY", "THE DIP"] },
  { id: "diamond-hands", lines: ["DIAMOND", "HANDS"] },
  { id: "probably-nothing", lines: ["PROBABLY", "NOTHING"] },
  { id: "few-understand", lines: ["FEW", "UNDERSTAND"] },
  { id: "still-early", lines: ["STILL", "EARLY"] },
  { id: "down-bad", lines: ["DOWN", "BAD"] },
  { id: "this-is-fine", lines: ["THIS IS", "FINE"] },
  { id: "nfa", lines: ["NOT", "FINANCIAL", "ADVICE"] },
  { id: "for-the-tech", lines: ["I'M IN IT", "FOR THE", "TECH"] },
  { id: "ser", lines: ["SER,", "THIS IS A", "T-SHIRT"] },
  { id: "exit-liquidity", lines: ["NOT YOUR", "EXIT", "LIQUIDITY"] },
  { id: "staying-poor", lines: ["HAVE FUN", "STAYING", "POOR"] },
  { id: "touch-grass", lines: ["WILL TOUCH", "GRASS", "AT ATH"] },
  { id: "one-btc", lines: ["1 BTC", "=", "1 BTC"], coins: ["BTC"] },
  { id: "stack-sats", lines: ["STACK", "SATS"], coins: ["BTC"] },
  { id: "ultrasound", lines: ["ULTRA", "SOUND", "MONEY"], coins: ["ETH"] },
  { id: "such-wow", lines: ["SUCH WOW", "VERY", "BULL"], coins: ["DOGE"] },
];

export const DEFAULT_SLOGAN = "hodl";

export function getSlogan(id: string | null | undefined): Slogan {
  return SLOGANS.find((s) => s.id === id) ?? SLOGANS[0];
}

/** Slogans to offer for a ticker: its in-jokes first, then the general list. */
export function slogansFor(ticker?: string): Slogan[] {
  const t = (ticker || "").toUpperCase();
  return [
    ...SLOGANS.filter((s) => s.coins?.includes(t)),
    ...SLOGANS.filter((s) => !s.coins),
  ];
}

export const styleUsesSlogan = (style: StyleId) => STYLES.find((s) => s.id === style)?.slogan ?? false;

export function isStyle(v: unknown): v is StyleId {
  return typeof v === "string" && (STYLE_IDS as string[]).includes(v);
}
