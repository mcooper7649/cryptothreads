/**
 * Give coins products on blanks they don't have yet, reusing each coin's
 * hottest existing design (style + slogan). Used when new blanks launch.
 *
 *   npx tsx scripts/seed-blanks.mts [--dry] BTC ETH ... -- tank womens_tee ...
 */
import { prisma } from "../src/lib/db";
import { generateProduct } from "../src/lib/generate";
import { productHeat } from "../src/lib/signals";
import { isBlankType, type BlankType } from "../src/lib/printful/blanks";
import type { StyleId } from "../src/lib/design/styles";

const args = process.argv.slice(2).filter((a) => a !== "--dry");
const dry = process.argv.includes("--dry");
const cut = args.indexOf("--");
const coins = (cut < 0 ? args : args.slice(0, cut)).map((c) => c.toUpperCase());
const blanks = (cut < 0 ? [] : args.slice(cut + 1)).filter(isBlankType) as BlankType[];
if (!coins.length || !blanks.length) throw new Error("usage: seed-blanks.mts COIN... -- blank...");

for (const coin of coins) {
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", query: { equals: coin, mode: "insensitive" }, design: { mode: "STYLIZED" } },
    include: { design: true },
  });
  const best = rows.filter((p) => p.blankType !== "sticker").sort((a, b) => productHeat(b) - productHeat(a))[0];
  if (!best) {
    console.log(`${coin}: no active design to reuse`);
    continue;
  }
  const { style, slogan } = best.design;
  for (const blankType of blanks) {
    const exists = rows.some((p) => p.blankType === blankType && p.design.style === style && p.design.slogan === slogan);
    if (exists) continue;
    if (dry) {
      console.log(`[dry] ${coin} ${style}/${slogan} -> ${blankType}`);
      continue;
    }
    try {
      const p = await generateProduct({ query: coin, style: style as StyleId, slogan: slogan ?? undefined, blankType });
      console.log(`${p.slug} (${p.status})`);
    } catch (e) {
      console.error(`FAIL ${coin} ${blankType}:`, (e as Error).message);
    }
  }
}
await prisma.$disconnect();
