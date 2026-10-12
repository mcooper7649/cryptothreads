import type { StyleId } from "@/lib/design/styles";

/**
 * Crypto calendar: conferences, anniversaries and shopping days, each with a
 * ready-made design that goes live `lead` days before the date and comes down
 * after it. The maintenance pass publishes them as trending slogans (source
 * "event"), so they render, sell and get ranked like any other.
 *
 * Slogans never name the event itself (conference names are trademarks); the
 * blurb on the site can. Dated entries are one-offs; month/day entries recur.
 */

export interface CryptoEvent {
  key: string;
  name: string;
  /** "YYYY-MM-DD" for a one-off, "MM-DD" to repeat every year. */
  start: string;
  /** Same format as start; defaults to start. */
  end?: string;
  /** Days before start the design goes up. */
  lead: number;
  lines: string[];
  ticker: string;
  style: StyleId;
  blurb: string;
}

export const EVENTS: CryptoEvent[] = [
  // One-offs (dates checked 2026-10-12)
  { key: "devcon-2026", name: "Devcon 8, Mumbai", start: "2026-11-03", end: "2026-11-06", lead: 14, lines: ["GM", "FROM", "MUMBAI"], ticker: "ETH", style: "stamp", blurb: "Devcon 8 takes over Mumbai, Nov 3-6." },
  { key: "breakpoint-2026", name: "Breakpoint, London", start: "2026-11-15", end: "2026-11-17", lead: 14, lines: ["MIND THE", "GAP UP"], ticker: "SOL", style: "chart", blurb: "Solana's Breakpoint hits London, Nov 15-17." },
  { key: "bitcoin-2027", name: "Bitcoin 2027, Nashville", start: "2027-07-15", end: "2027-07-17", lead: 21, lines: ["HODL", "Y'ALL"], ticker: "BTC", style: "slogan", blurb: "The big Bitcoin conference heads to Nashville, Jul 15-17." },

  // Every year
  { key: "genesis", name: "Genesis block day", start: "01-03", lead: 7, lines: ["BLOCK 0", "JAN 3", "2009"], ticker: "BTC", style: "stamp", blurb: "Bitcoin's genesis block was mined on Jan 3, 2009." },
  { key: "valentines", name: "Valentine's Day", start: "02-14", lead: 12, lines: ["YOU HAD ME", "AT GM"], ticker: "ETH", style: "slogan", blurb: "For the one who says gm back." },
  { key: "april-fools", name: "April Fools' Day", start: "04-01", lead: 7, lines: ["THIS TIME", "IS", "DIFFERENT"], ticker: "BTC", style: "box", blurb: "The oldest joke in crypto, for April 1." },
  { key: "pizza-day", name: "Bitcoin Pizza Day", start: "05-22", lead: 12, lines: ["10,000 BTC", "FOR TWO", "PIZZAS"], ticker: "BTC", style: "receipt", blurb: "May 22, 2010: two pizzas for 10,000 BTC." },
  { key: "eth-birthday", name: "Ethereum's birthday", start: "07-30", lead: 10, lines: ["SINCE", "JULY 30", "2015"], ticker: "ETH", style: "stamp", blurb: "Ethereum went live on July 30, 2015." },
  { key: "whitepaper", name: "Bitcoin whitepaper day", start: "10-31", lead: 12, lines: ["9 PAGES", "CHANGED", "EVERYTHING"], ticker: "BTC", style: "receipt", blurb: "The Bitcoin whitepaper dropped on Oct 31, 2008." },
  { key: "halloween", name: "Halloween", start: "10-31", lead: 12, lines: ["MY BAGS", "ARE THE", "COSTUME"], ticker: "SOL", style: "slogan", blurb: "Scariest costume this year: your portfolio." },
  { key: "thanksgiving", name: "Thanksgiving", start: "thanksgiving", lead: 7, lines: ["THANKFUL", "FOR GREEN", "CANDLES"], ticker: "ETH", style: "chart", blurb: "Grateful for every green candle." },
  { key: "black-friday", name: "Black Friday", start: "black-friday", end: "cyber-monday", lead: 6, lines: ["BLACK FRIDAY", "BOUGHT", "THE DIP"], ticker: "BTC", style: "receipt", blurb: "The only Black Friday deal that matters." },
  { key: "christmas", name: "Christmas", start: "12-25", lead: 21, lines: ["ALL I WANT", "IS A", "GREEN CANDLE"], ticker: "BTC", style: "chart", blurb: "Dear Santa: one green candle, please." },
  { key: "new-year", name: "New Year", start: "01-01", lead: 6, lines: ["NEW YEAR", "SAME", "BAGS"], ticker: "DOGE", style: "slogan", blurb: "Resolutions: none. Bags: same." },
];

const DAY = 86_400_000;

/** US Thanksgiving: the 4th Thursday of November. */
function thanksgiving(year: number): Date {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const firstThu = 1 + ((4 - nov1.getUTCDay() + 7) % 7);
  return new Date(Date.UTC(year, 10, firstThu + 21));
}

function resolve(spec: string, year: number): Date {
  if (spec === "thanksgiving") return thanksgiving(year);
  if (spec === "black-friday") return new Date(thanksgiving(year).getTime() + DAY);
  if (spec === "cyber-monday") return new Date(thanksgiving(year).getTime() + 4 * DAY);
  if (/^\d{4}-/.test(spec)) return new Date(`${spec}T00:00:00Z`);
  return new Date(`${year}-${spec}T00:00:00Z`);
}

export interface EventWindow {
  event: CryptoEvent;
  start: Date;
  /** End of the last day. */
  end: Date;
  showFrom: Date;
}

/** This or next year's occurrence of each event that hasn't ended yet. */
function occurrences(now: Date): EventWindow[] {
  const out: EventWindow[] = [];
  for (const event of EVENTS) {
    const fixed = /^\d{4}-/.test(event.start);
    for (const year of fixed ? [0] : [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
      const start = resolve(event.start, year);
      const end = new Date(resolve(event.end ?? event.start, year).getTime() + DAY - 1);
      if (end.getTime() < now.getTime()) continue;
      out.push({ event, start, end, showFrom: new Date(start.getTime() - event.lead * DAY) });
      break;
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Events whose design should be live right now. */
export const liveEvents = (now = new Date()) => occurrences(now).filter((w) => w.showFrom <= now);

/** The next few events, live or not, for the "Coming up" strip. */
export const upcomingEvents = (limit = 4, now = new Date()) => occurrences(now).slice(0, limit);
