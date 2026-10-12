import { SLOGANS } from "@/lib/design/styles";

/**
 * Gate for auto-published trending slogans. They go live without a human look,
 * so this errs on the side of rejecting: short, printable, and nothing that
 * names a brand, a character, a real person, politics, or slurs.
 */

const MAX_LINES = 3;
const MAX_LINE = 12; // the stacked styles get cramped past this
const MAX_TOTAL = 30;
// Glyphs the bundled fonts print cleanly.
const PRINTABLE = /^[A-Z0-9 $'!?,.&()#%+=\-/]+$/;

// Substring matches on the squashed text (spaces and punctuation removed).
const BLOCKED = [
  // trademarks, characters and meme images we can't print
  "pudgy", "penguin", "pepe", "wojak", "disney", "mickey", "marvel", "pokemon", "pikachu",
  "nike", "adidas", "supreme", "gucci", "apple", "tesla", "spacex", "nintendo", "simpsons", "spongebob",
  "coinbase", "binance", "robinhood", "blackrock", "kraken", "opensea", "ftx", "fifa", "olympic",
  "starbucks", "mcdonald", "cocacola", "pepsi", "playboy", "harrypotter", "starwars",
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
  // claims we can't make on a shirt
  "guarantee", "giveaway", "airdrop", "freemoney", "100x", "1000x",
];
// Whole-word matches (too short for substring matching).
const BLOCKED_WORDS = [
  "ICE", "CZ", "SBF", "AOC", "RFK", "GOP", "DEI", "KKK", "SEX", "ASS", "CP", "NFL", "NBA", "ELON", "VANCE",
  "PUTIN", "VOTE", "WOKE", "GUN", "GUNS", "RAPE", "KYS", "CUM", "METH", "SPIC", "CHAD", "GIGACHAD",
];

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
  const hit = BLOCKED.find((b) => flat.includes(b));
  if (hit) return `blocked term (${hit})`;
  const words = lines.join(" ").split(/[^A-Z0-9]+/);
  const word = BLOCKED_WORDS.find((w) => words.includes(w));
  if (word) return `blocked term (${word})`;
  if (SLOGANS.some((s) => squash(s.lines.join("")) === flat)) return "already in the slogan library";
  return null;
}
