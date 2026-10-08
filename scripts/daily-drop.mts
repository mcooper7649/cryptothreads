/**
 * Deterministic daily-drop job (fallback / reference for the Claude routine).
 * Picks trending coins, generates products, and publishes a content post.
 *
 *   DATABASE_URL=... npx tsx scripts/daily-drop.mts
 *
 * The preferred path is the Claude scheduled routine (see scripts/daily-routine.md),
 * which writes richer prose. This script keeps the pipeline runnable headless.
 */
import { getTrendingCoins } from "../src/lib/trending";
import { generateProduct } from "../src/lib/generate";
import { prisma } from "../src/lib/db";
import { formatPrice } from "../src/lib/format";
import { STYLES, slogansFor } from "../src/lib/design/styles";
import { BLANK_TYPES } from "../src/lib/printful/blanks";

/** Pick an element deterministically from the date + coin, so reruns make the same drop. */
function pick<T>(list: readonly T[], key: string): T {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

const COUNT = parseInt(process.env.DAILY_DROP_COUNT || "2", 10);

function slugForToday(): string {
  // Date is passed in via env to keep the script deterministic/testable.
  const day = process.env.DROP_DATE || "today";
  return `daily-drop-${day}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

async function main() {
  const trending = await getTrendingCoins(COUNT);
  if (!trending.length) {
    console.log("no trending coins; nothing to drop");
    return;
  }

  const made: { symbol: string; name: string; slug: string; priceCents: number }[] = [];
  for (const coin of trending) {
    try {
      // Two pieces per coin: a meme tee plus a random style on a random blank.
      const day = process.env.DROP_DATE || new Date().toISOString().slice(0, 10);
      const slogans = slogansFor(coin.symbol);
      const combos = [
        { style: "slogan" as const, blankType: "tee" as const, slogan: pick(slogans, `${day}${coin.symbol}a`).id },
        {
          style: pick(STYLES.filter((x) => x.id !== "slogan"), `${day}${coin.symbol}b`).id,
          blankType: pick(BLANK_TYPES, `${day}${coin.symbol}c`),
          slogan: pick(slogans, `${day}${coin.symbol}d`).id,
        },
      ];
      for (const c of combos) {
        const product = await generateProduct({ query: coin.symbol || coin.id, mode: "STYLIZED", ...c });
        made.push({ symbol: coin.symbol, name: coin.name, slug: product.slug, priceCents: product.priceCents });
        console.log("generated", product.slug, product.status);
      }
    } catch (e) {
      console.error("failed to generate for", coin.symbol, e);
    }
  }

  if (!made.length) return;

  const title = `Daily Drop: ${made.map((m) => "$" + m.symbol).join(" & ")}`;
  const body = [
    `Today's trending coins just hit the rack.`,
    ``,
    ...made.map(
      (m) =>
        `## ${m.name} ($${m.symbol})\nFresh stylized ${"$" + m.symbol} apparel, printed on demand. ` +
        `[Grab the tee](/product/${m.slug}) — ${formatPrice(m.priceCents)}.`
    ),
  ].join("\n");

  const post = await prisma.contentPost.create({
    data: {
      title,
      slug: slugForToday(),
      excerpt: `New drops for ${made.map((m) => "$" + m.symbol).join(", ")}.`,
      bodyMdx: body,
      coinRefs: made.map((m) => m.symbol),
      productIds: [],
    },
  });
  console.log("published post", post.slug);

  // Optional: trigger a Vercel redeploy so ISR/static content refreshes.
  if (process.env.VERCEL_DEPLOY_HOOK_URL) {
    await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {});
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
