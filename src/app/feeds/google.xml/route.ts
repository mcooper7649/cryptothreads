import { prisma } from "@/lib/db";
import { abs, coinDisplayName, dollars, onSite, SITE_NAME } from "@/lib/seo";
import { BLANKS, isBlankType, SHIPPING_FLAT_CENTS, type BlankConfig } from "@/lib/printful/blanks";
import { findSlogan } from "@/lib/slogans";

export const dynamic = "force-dynamic";

/** Google product taxonomy paths (Google accepts the text form). */
const CATEGORY: Record<BlankConfig["format"], string> = {
  apparel: "Apparel & Accessories > Clothing > Shirts & Tops",
  hat: "Apparel & Accessories > Clothing Accessories > Hats",
  mug: "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs",
  towel: "Home & Garden > Linens & Bedding > Towels > Beach Towels",
  backpack: "Luggage & Bags > Backpacks",
  sticker: "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tag = (k: string, v: string | undefined) => (v ? `<g:${k}>${esc(v)}</g:${k}>` : "");

/**
 * Google Merchant Center feed (free listings + Shopping): one item per size, grouped
 * by product, so apparel carries the size/color/gender Google requires.
 */
export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { design: { select: { previewUrl: true, slogan: true } } },
    orderBy: { createdAt: "desc" },
  });
  const items: string[] = [];
  for (const p of products) {
    if (!isBlankType(p.blankType)) continue;
    const blank = BLANKS[p.blankType];
    const image = onSite(p.mockupUrls[0] ?? p.design.previewUrl);
    if (!image) continue;
    const coin = coinDisplayName(p.query ?? "");
    const slogan = p.design.slogan ? await findSlogan(p.design.slogan) : null;
    const quote = slogan ? `"${slogan.lines.join(" ")}" ` : "";
    const description =
      `${quote}${coin} ${blank.label.toLowerCase()} from ${SITE_NAME}, crypto apparel printed on demand. ` +
      `${blank.format === "apparel" ? "Black garment, " : ""}ships in the US for a flat $${dollars(SHIPPING_FLAT_CENTS)}. Pay by card or USDC.`;
    const variants = Array.isArray(p.variants) ? (p.variants as { size?: string; color?: string }[]) : [];
    const color = blank.color ?? variants.find((v) => v.color)?.color ?? "Black";
    const extra = p.mockupUrls.slice(1, 4).map((u) => onSite(u)).filter(Boolean) as string[];
    for (const size of blank.sizes) {
      items.push(
        "<item>" +
          tag("id", `${p.id}-${size}`.slice(0, 50)) +
          tag("item_group_id", p.id) +
          tag("title", `${p.title}${blank.sizes.length > 1 ? ` - ${size}` : ""}`.slice(0, 150)) +
          tag("description", description) +
          tag("link", abs(`/product/${p.slug}`)) +
          tag("image_link", image) +
          extra.map((u) => tag("additional_image_link", u)).join("") +
          tag("availability", "in_stock") +
          tag("price", `${dollars(p.priceCents)} USD`) +
          tag("brand", SITE_NAME) +
          tag("condition", "new") +
          tag("identifier_exists", "no") +
          tag("google_product_category", CATEGORY[blank.format]) +
          tag("product_type", `${blank.category === "womens" ? "Women's" : blank.category === "accessories" ? "Accessories" : "Men's & unisex"} > ${blank.label}`) +
          tag("age_group", "adult") +
          tag("gender", blank.category === "womens" ? "female" : "unisex") +
          tag("color", color) +
          tag("size", size) +
          `<g:shipping>${tag("country", "US")}${tag("price", `${dollars(SHIPPING_FLAT_CENTS)} USD`)}</g:shipping>` +
          "</item>"
      );
    }
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
    `<title>${SITE_NAME}</title><link>${abs("/")}</link><description>Crypto apparel, printed on demand</description>` +
    items.join("\n") +
    `</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
