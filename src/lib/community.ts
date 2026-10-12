import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { normalizeLines, rejectReason, tickerRejectReason } from "@/lib/trend-filter";
import { publishSlogan } from "@/lib/trending-publish";

/**
 * "Shill us yours": shoppers submit a coin + slogan, everyone votes, and
 * anything that reaches PROMOTE_AT votes is printed into the trending set.
 * Submissions pass the same filter as auto-published slogans, so the board
 * only ever shows things we'd be willing to print.
 */

export const PROMOTE_AT = 5;
const PER_IP_PER_DAY = 3;
const DAY = 86_400_000;

/** Salted so stored hashes can't be matched back to IPs. */
export const hashIp = (ip: string) =>
  createHash("sha256").update(`${process.env.ADMIN_TOKEN ?? "ct"}:${ip}`).digest("hex").slice(0, 32);

export async function submitIdea(input: { lines: string[]; ticker: string }, ipHash: string) {
  const lines = normalizeLines(input.lines);
  const ticker = input.ticker.replace(/^\$/, "").trim().toUpperCase();
  const reason = rejectReason(lines) ?? tickerRejectReason(ticker);
  if (reason) return { error: reason };
  const recent = await prisma.submission.count({ where: { ipHash, createdAt: { gt: new Date(Date.now() - DAY) } } });
  if (recent >= PER_IP_PER_DAY) return { error: `${PER_IP_PER_DAY} ideas a day, max. Come back tomorrow.` };
  const dupe = await prisma.submission.findFirst({ where: { ticker, lines: { equals: lines }, status: { not: "HIDDEN" } } });
  if (dupe) return { error: "Someone already shilled that one. Go vote for it." };
  const sub = await prisma.submission.create({ data: { lines, ticker, ipHash } });
  // The submitter's own vote.
  await vote(sub.id, ipHash);
  return { submission: sub };
}

export async function vote(submissionId: string, voterHash: string) {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!sub || sub.status === "HIDDEN") return { error: "not found" as const };
  try {
    await prisma.vote.create({ data: { submissionId, voterHash } });
  } catch {
    return { error: "already voted" as const };
  }
  const updated = await prisma.submission.update({ where: { id: submissionId }, data: { votes: { increment: 1 } } });
  if (updated.status === "LIVE" && updated.votes >= PROMOTE_AT) await promote(updated.id);
  return { votes: updated.votes };
}

/** Print a submission into the trending set (7 days, like the collector's). */
export async function promote(submissionId: string) {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!sub || sub.status !== "LIVE") return null;
  const r = await publishSlogan(
    { lines: sub.lines, ticker: sub.ticker, blurb: `Shilled to us by the community, ${sub.votes} votes.`, source: "community", score: 6 + Math.min(sub.votes, 20) / 5, keepTicker: true },
    new Date(Date.now() + 7 * DAY)
  );
  if (r.status === "rejected") {
    console.warn("[community] promote rejected:", sub.id, r.reason);
    return null;
  }
  await prisma.submission.update({ where: { id: sub.id }, data: { status: "PROMOTED", sloganId: r.id } });
  return r.id;
}

/** Catch-up for promotions that failed inline (render hiccup, etc.). */
export async function promotePending() {
  const due = await prisma.submission.findMany({ where: { status: "LIVE", votes: { gte: PROMOTE_AT } } });
  let n = 0;
  for (const s of due) if (await promote(s.id)) n++;
  return n;
}

export async function getBoard(limit = 60) {
  return prisma.submission
    .findMany({
      where: { status: { in: ["LIVE", "PROMOTED"] }, createdAt: { gt: new Date(Date.now() - 30 * DAY) } },
      orderBy: [{ votes: "desc" }, { createdAt: "desc" }],
      take: limit,
    })
    .catch(() => []);
}
