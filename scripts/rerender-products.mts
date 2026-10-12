/**
 * Re-render every product's print file, preview and Printful mockups with the
 * current templates, and refresh its title. Live trending-slogan previews too. Use after a template change that
 * alters printed art (e.g. dropping the "$" from tickers).
 *
 *   npx tsx scripts/rerender-products.mts [--dry] [slug ...]
 *
 * Asset keys are rewritten in place, so stored URLs get a ?v= stamp to get past
 * the day-long /cache and Cloudflare caching.
 */
import { prisma } from "../src/lib/db";
import { buildPrintAsset, printfulListing } from "../src/lib/generate";
import { fetchLogoFromSources } from "../src/lib/logo/resolve";
import { renderPrintFile } from "../src/lib/design/render";
import { putAsset } from "../src/lib/storage";
import type { BlankType } from "../src/lib/printful/blanks";
import type { StyleId } from "../src/lib/design/styles";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = args.filter((a) => !a.startsWith("--"));
const v = `v=${Date.now()}`;
const stamp = (u: string) => (/^https?:\/\//.test(u) ? `${u.split("?")[0]}?${v}` : u);

const products = await prisma.product.findMany({
  where: only.length ? { slug: { in: only } } : {},
  include: { design: true },
  orderBy: { createdAt: "asc" },
});

let ok = 0;
for (const p of products) {
  const title = p.title.replace(/^\$/, "");
  if (dry || !p.query) {
    console.log(`${dry ? "[dry]" : "[skip: no query]"} ${p.slug}: ${p.title} -> ${title}`);
    continue;
  }
  try {
    const blankType = p.blankType as BlankType;
    const asset = await buildPrintAsset(
      p.query,
      { mode: p.design.mode, style: p.design.style as StyleId, slogan: p.design.slogan ?? undefined },
      blankType
    );
    const { mockupUrls } = await printfulListing(asset, blankType);
    await prisma.design.update({
      where: { id: p.designId },
      data: { printFileUrl: stamp(asset.printUrl), previewUrl: stamp(asset.previewUrl) },
    });
    await prisma.product.update({
      where: { id: p.id },
      // Keep the old mockups if Printful failed rather than blanking the listing.
      data: { title, ...(mockupUrls.length ? { mockupUrls: mockupUrls.map(stamp) } : {}) },
    });
    ok++;
    console.log(`ok ${p.slug}: ${title} (${mockupUrls.length} mockups)`);
  } catch (err) {
    console.error(`FAIL ${p.slug}:`, err);
  }
}
console.log(`done: ${ok}/${products.length}`);

if (!only.length) {
  const live = await prisma.trendingSlogan.findMany({ where: { expiresAt: { gt: new Date() } } });
  for (const t of live) {
    if (dry) {
      console.log(`[dry] trending ${t.id}`);
      continue;
    }
    try {
      const logo = await fetchLogoFromSources(t.ticker).catch(() => null);
      const out = await renderPrintFile({
        logoData: logo?.data,
        isVector: logo?.isVector,
        ticker: t.ticker,
        style: t.style as StyleId,
        sloganLines: t.lines,
        previewOnly: true,
      });
      const stored = await putAsset(`trending/${t.id}-${t.style}-${t.ticker.toLowerCase()}.png`, out.previewPng, "image/png");
      await prisma.trendingSlogan.update({ where: { id: t.id }, data: { previewUrl: stamp(stored.url) } });
      console.log(`ok trending ${t.id}`);
    } catch (err) {
      console.error(`FAIL trending ${t.id}:`, err);
    }
  }
}
await prisma.$disconnect();
