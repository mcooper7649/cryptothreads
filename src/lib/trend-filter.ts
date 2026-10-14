import { SLOGANS } from "@/lib/design/styles";

/**
 * Gate for auto-published trending slogans. They go live without a human look,
 * so this errs on the side of rejecting: short, printable, and nothing that
 * names a brand, a character, a real person, politics, or slurs.
 */

const MAX_LINES = 3;
const MAX_LINE = 12; // the stacked styles get cramped past this
const MAX_TOTAL = 34;
// Glyphs the bundled fonts print cleanly.
const PRINTABLE = /^[A-Z0-9 $'!?,.&()#%+=\-/]+$/;

// Substring matches inside each word; terms of CROSS_MIN+ letters also match across
// words (so "CASH APP" and "HARRY POTTER" still hit), and so does spaced-out "F U C K".
const BLOCKED = [
  // trademarks, characters and meme images we can't print
  "pudgy", "penguin", "pepe", "wojak", "disney", "mickey", "marvel", "pokemon", "pikachu",
  "nike", "adidas", "supreme", "gucci", "apple", "tesla", "spacex", "nintendo", "simpsons", "spongebob",
  "coinbase", "binance", "robinhood", "blackrock", "kraken", "opensea", "ftx", "fifa", "olympic",
  "starbucks", "mcdonald", "cocacola", "pepsi", "playboy", "harrypotter", "starwars",
  "microsoft", "google", "amazon", "facebook", "instagram", "tiktok", "youtube", "openai", "chatgpt", "nvidia",
  "paypal", "mastercard", "venmo", "cashapp", "jpmorgan", "goldman", "fidelity", "vanguard", "metamask",
  "phantom", "trezor", "polymarket", "pumpfun", "kalshi", "hyperliquid",
  // real people
  "musk", "trump", "biden", "harris", "obama", "saylor", "vitalik", "buterin", "changpeng",
  "bankman", "dokwon", "gensler", "powell", "jpow", "zelensk", "netanyahu", "kanye", "diddy",
  // politics and news
  "maga", "democrat", "republican", "election", "liberal", "israel", "palestin", "gaza",
  "ukraine", "russia", "abortion", "immigra", "deport", "fbi", "police", "terror",
  // violence, sex, drugs, slurs
  "kill", "murder", "shoot", "bomb", "suicide", "nazi", "hitler", "isis",
  "porn", "sex", "nude", "cock", "dick", "pussy", "fuck", "shit", "bitch", "cunt", "whore",
  "cocaine", "heroin", "fent", "retard", "fag", "nigg", "tranny", "kike", "chink", "gook",
  // claims we can't make on a shirt (airdrop/100x jokes are fine: they are the culture, not promises)
  "guarantee", "giveaway", "freemoney",
];
// Whole-word matches (too short for substring matching).
const BLOCKED_WORDS = [
  "ICE", "CZ", "SBF", "AOC", "RFK", "GOP", "DEI", "KKK", "SEX", "ASS", "CP", "NFL", "NBA", "ELON", "VANCE",
  "PUTIN", "VOTE", "WOKE", "GUN", "GUNS", "RAPE", "KYS", "CUM", "METH", "SPIC", "CHAD", "GIGACHAD",
];

// Real words that contain a blocked term.
const ALLOWED_WORDS = ["SKILL", "SKILLS", "SKILLED", "SKILLFUL", "SKILLSET", "ESSEX", "SUSSEX"];
const CROSS_MIN = 5;

function blockedHit(text: string): string | undefined {
  const words = text.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const inWord = words
    .filter((w) => !ALLOWED_WORDS.includes(w))
    .map(squash)
    .flatMap((w) => BLOCKED.filter((b) => w.includes(b)));
  if (inWord.length) return inWord[0];
  const whole = squash(text);
  const across = BLOCKED.find((b) => b.length >= CROSS_MIN && whole.includes(b));
  if (across) return across;
  // Runs of 1-2 letter tokens ("F U C K", "S H I T").
  let run = "";
  for (const w of [...words, "END"]) {
    if (w.length <= 2) { run += w; continue; }
    const hit = run.length >= 3 ? BLOCKED.find((b) => squash(run).includes(b)) : undefined;
    if (hit) return hit;
    run = "";
  }
  return undefined;
}

export const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function normalizeLines(lines: string[]): string[] {
  return lines.map((l) => l.toUpperCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Returns why a slogan can't be published, or null when it passes. */
export function rejectReason(lines: string[]): string | null {
  if (!lines.length || lines.length > MAX_LINES) return "needs 1-3 lines";
  if (lines.some((l) => l.length > MAX_LINE)) return `a line is over ${MAX_LINE} characters`;
  if (lines.join(" ").length > MAX_TOTAL) return "too long overall";
  if (lines.some((l) => !PRINTABLE.test(l))) return "has characters we can't print";
  const flat = squash(lines.join(""));
  if (flat.length < 2) return "too short";
  const hit = blockedHit(lines.join(" "));
  if (hit) return `blocked term (${hit})`;
  const words = lines.join(" ").split(/[^A-Z0-9]+/);
  const word = BLOCKED_WORDS.find((w) => words.includes(w));
  if (word) return `blocked term (${word})`;
  if (SLOGANS.some((s) => squash(s.lines.join("")) === flat)) return "already in the slogan library";
  return null;
}

/** Tickers print on the shirt too (as the coin line), so they get the same blocklist. */
export function tickerRejectReason(ticker: string): string | null {
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return "ticker isn't 2-10 letters/digits";
  const flat = squash(ticker);
  const hit = BLOCKED.find((b) => flat.includes(b)) ?? BLOCKED_WORDS.find((w) => w === ticker);
  return hit ? `blocked ticker (${hit})` : null;
}


// Words that carry no joke on their own, for near-duplicate checks.
const STOP = new Set(
  "A AN THE I IM MY ME WE OUR YOU YOUR IT ITS IS ARE WAS WERE BE BEEN AM TO OF IN ON AT FOR WITH AND OR BUT SO JUST STILL ALL NO NOT DONT THIS THAT THESE GOT GET UP OUT AGAIN".split(" ")
);
const stem = (w: string) => w.replace(/(ING|ED|ES|S)$/, "") || w;
export const jokeWords = (lines: string[]) =>
  new Set(lines.join(" ").toUpperCase().replace(/'/g, "").split(/[^A-Z0-9]+/).filter((w) => w && !STOP.has(w)).map(stem));

/** Same joke reworded ("IT'S ON THE BOX / I TRUSTED IT" vs "IT WAS LITERALLY / ON THE BOX"). */
export function nearDuplicate(a: string[], b: string[]): boolean {
  const A = jokeWords(a);
  const B = jokeWords(b);
  let shared = 0;
  A.forEach((w) => { if (B.has(w)) shared++; });
  const union = A.size + B.size - shared;
  return shared >= 2 || (shared >= 1 && union <= 3);
}
