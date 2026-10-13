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
  { id: "gothic", label: "Gothic", blurb: "Blackletter type, streetwear classic", slogan: true },
  { id: "warning", label: "Warning label", blurb: "Hazard-yellow label for a volatile portfolio", slogan: true },
  { id: "headline", label: "Headline", blurb: "Front page of The Degen Times", slogan: true },
  { id: "vapor", label: "Vaporwave", blurb: "Striped sunset, neon grid, 1999 energy", slogan: true },
  { id: "terminal", label: "Terminal", blurb: "Green CRT command line", slogan: true },
  { id: "tarot", label: "Tarot", blurb: "Gold tarot card with your coin as the sigil", slogan: true },
  { id: "nouns", label: "Nouns", blurb: "A real Noun (public-domain NFT art) with your slogan", slogan: true },
  // Public-domain paintings with a crypto spin (src/lib/design/artworks.ts).
  { id: "art-scream", label: "The Scream", blurb: "Munch's scream: panic, checking your bags", slogan: true, group: "art" },
  { id: "art-monalisa", label: "Mona Lisa", blurb: "Laser-eyed Mona Lisa, unbothered hodler", slogan: true, group: "art" },
  { id: "art-wave", label: "Great Wave", blurb: "Hokusai's wave: the dip arrives", slogan: true, group: "art" },
  { id: "art-napoleon", label: "Napoleon", blurb: "Laser-eyed emperor, whale energy", slogan: true, group: "art" },
  { id: "art-adam", label: "Creation", blurb: "Michelangelo's hands: passing the bag", slogan: true, group: "art" },
  { id: "art-liberty", label: "Liberty", blurb: "Laser-eyed Liberty leading the bulls", slogan: true, group: "art" },
  { id: "art-socrates", label: "Socrates", blurb: "Drinking the hemlock: buying the top", slogan: true, group: "art" },
  { id: "art-harvesters", label: "Harvesters", blurb: "Bruegel's farmers: airdrop season", slogan: true, group: "art" },
  { id: "art-delaware", label: "Crossing", blurb: "Washington crossing: we ride at dawn", slogan: true, group: "art" },
  { id: "art-pearl", label: "Pearl Earring", blurb: "Laser-eyed Vermeer looking back at the chart", slogan: true, group: "art" },
  { id: "art-starry", label: "Starry Night", blurb: "Van Gogh at 3am, watching candles", slogan: true, group: "art" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
/** Public-domain painting styles ("art-*") are listed apart from the graphic styles. */
export const isArtStyle = (id: string) => id.startsWith("art-");
export const STYLE_GROUPS = [
  { label: "Graphic", styles: STYLES.filter((s) => !isArtStyle(s.id)) },
  { label: "Old masters, new bags", styles: STYLES.filter((s) => isArtStyle(s.id)) },
];
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
  // From what crypto X was posting in October 2026.
  { id: "crypto-is-back", lines: ["CRYPTO", "IS BACK", "(AGAIN)"] },
  { id: "find-a-meme", lines: ["FIND A", "MEME AND", "PRAY"] },
  { id: "shill-me", lines: ["SHILL ME", "YOUR", "TICKERS"] },
  { id: "dont-ask", lines: ["DON'T ASK", "HOW MUCH", "I'M DOWN"] },
  { id: "green-candle", lines: ["THE GREEN", "CANDLE", "FINDS YOU"] },
  { id: "one-btc", lines: ["1 BTC", "=", "1 BTC"], coins: ["BTC"] },
  { id: "stack-sats", lines: ["STACK", "SATS"], coins: ["BTC"] },
  { id: "ultrasound", lines: ["ULTRA", "SOUND", "MONEY"], coins: ["ETH"] },
  { id: "such-wow", lines: ["SUCH WOW", "VERY", "BULL"], coins: ["DOGE"] },
  { id: "xrp-army", lines: ["XRP", "ARMY"], coins: ["XRP"] },
  { id: "privacy-normal", lines: ["PRIVACY", "IS", "NORMAL"], coins: ["ZEC"] },
  { id: "sol-summer", lines: ["SOLANA", "SUMMER"], coins: ["SOL"] },
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
