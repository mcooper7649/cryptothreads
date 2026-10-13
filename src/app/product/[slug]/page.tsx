import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { abs, coinDisplayName, dollars, onSite, SITE_NAME } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice } from "@/lib/format";
import { BLANKS, isBlankType, sizeRank } from "@/lib/printful/blanks";
import { STYLES } from "@/lib/design/styles";
import { findSlogan } from "@/lib/slogans";
import { headers } from "next/headers";
import { bumpProduct, isBot } from "@/lib/signals";

export const dynamic = "force-dynamic";

/** How each kind of blank is described in copy. */
const KIND: Record<string, (label: string) => string> = {
  apparel: (l) => `${l.toLowerCase()} on black`,
  sticker: () => "vinyl sticker",
  mug: () => "black-wrap ceramic mug",
  hat: () => "black dad hat",
  towel: () => "black beach towel",
  backpack: () => "black all-over-print backpack",
};
const DETAILS: Record<string, string> = {
  apparel: "Printed on a black garment, front print, direct-to-garment.",
  sticker: "Kiss-cut vinyl sticker with a black backing. Waterproof and laptop-ready.",
  mug: "Glossy ceramic mug with a black wrap and the design on both sides. Dishwasher and microwave safe.",
  hat: "Black cotton dad hat, adjustable strap, full-color print on the front.",
  towel: "30\"×60\" beach towel, soft polyester front and cotton back, printed black with the design big.",
  backpack: "Water-resistant all-over-print backpack, padded laptop pocket, printed black with the design on the front.",
};

interface Variant {
  variantId: number;
  size?: string;
  color?: string;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product || product.status !== "ACTIVE") return { title: "Not found", robots: { index: false } };
  const blank = isBlankType(product.blankType) ? BLANKS[product.blankType] : null;
  const sym = (product.query ?? product.design.logo.symbol ?? "").toUpperCase();
  const coin = coinDisplayName(sym, product.design.logo.name) ?? sym;
  const description =
    `${product.title}: ${coin} ${KIND[blank?.format ?? "apparel"](blank?.label ?? "shirt")}, ` +
    `printed on demand for ${formatPrice(product.priceCents)}. Ships in the US for a flat $5. Pay by card or USDC.`;
  const image = onSite(product.mockupUrls[0] ?? product.design.previewUrl);
  return {
    title: product.title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { type: "website", title: product.title, description, url: `/product/${product.slug}`, ...(image ? { images: [{ url: image, alt: product.title }] } : {}) },
    twitter: { card: "summary_large_image", title: product.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || product.status !== "ACTIVE") notFound();
  const related = await getRelatedProducts(product);
  if (!isBot(headers().get("user-agent"))) void bumpProduct(product.id, "views");

  const variants = (product.variants as unknown as Variant[]) ?? [];
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter((s): s is string => !!s))).sort(
    (a, b) => sizeRank(a) - sizeRank(b)
  );
  const images = [...product.mockupUrls, product.design.previewUrl].filter((u): u is string => !!u);
  const blank = isBlankType(product.blankType) ? BLANKS[product.blankType] : null;
  const style = STYLES.find((s) => s.id === product.design.style);
  const slogan = (await findSlogan(product.design.slogan))?.lines.join(" ") ?? null;
  // The coin query used to regenerate the print file at fulfillment time.
  const query = product.query ?? product.design.logo.symbol ?? product.title.replace(/\$/g, "").split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: product.title,
              url: abs(`/product/${product.slug}`),
              image: images.map((u) => onSite(u)),
              description: `${product.title}: ${KIND[blank?.format ?? "apparel"](blank?.label ?? "shirt")}, printed on demand.`,
              brand: { "@type": "Brand", name: SITE_NAME },
              category: { sticker: "Stickers", mug: "Mugs", hat: "Hats", towel: "Towels", backpack: "Bags", apparel: "Apparel" }[blank?.format ?? "apparel"],
              offers: {
                "@type": "Offer",
                url: abs(`/product/${product.slug}`),
                priceCurrency: "USD",
                price: dollars(product.priceCents),
                availability: "https://schema.org/InStock",
                itemCondition: "https://schema.org/NewCondition",
                shippingDetails: {
                  "@type": "OfferShippingDetails",
                  shippingRate: { "@type": "MonetaryAmount", value: "5.00", currency: "USD" },
                  shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
                  deliveryTime: {
                    "@type": "ShippingDeliveryTime",
                    handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" },
                    transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 7, unitCode: "DAY" },
                  },
                },
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Shop", item: abs("/shop") },
                { "@type": "ListItem", position: 2, name: query.toUpperCase(), item: abs(`/coin/${encodeURIComponent(query.toUpperCase())}`) },
                { "@type": "ListItem", position: 3, name: product.title, item: abs(`/product/${product.slug}`) },
              ],
            },
          ],
        }}
      />
      <nav className="mb-6 text-sm text-[var(--dim)]">
        <Link href="/shop" className="hover:text-[var(--acid)]">Shop</Link>
        {" / "}
        <Link href={`/coin/${encodeURIComponent(query.toUpperCase())}`} className="hover:text-[var(--acid)]">
          {query.toUpperCase()}
        </Link>
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          <div className="garment aspect-square border-2 border-[var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0]} alt={product.title} className="h-full w-full object-contain" />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1, 5).map((src) => (
                <div key={src} className="garment aspect-square border-2 border-[var(--line)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="The print file on its own" className="h-full w-full object-contain" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="label">
            {blank?.label ?? product.blankType} · {style?.label ?? "Logo"} style
          </p>
          <h1 className="display text-[clamp(2.75rem,5vw,4.5rem)]">{product.title}</h1>
          <p className="mt-4">
            <span className="price-tag text-3xl">{formatPrice(product.priceCents)}</span>
          </p>
          {slogan && <p className="marker mt-6 -rotate-1 text-2xl text-[var(--acid)]">&ldquo;{slogan.toLowerCase()}&rdquo;</p>}

          <div className="mt-8">
            <AddToCart
              title={product.title}
              blankType={product.blankType}
              mode={product.design.mode}
              style={product.design.style}
              slogan={product.design.slogan}
              query={query}
              previewUrl={images[0] ?? ""}
              priceCents={product.priceCents}
              sizes={sizes}
            />
          </div>

          <ul className="mt-8 space-y-2 border-t-2 border-[var(--line)] pt-6 text-sm text-[var(--dim)]">
            <li>
              {DETAILS[blank?.format ?? "apparel"]}
            </li>
            <li>Made after you order, then shipped to the US for a flat $5. Usually 5–12 business days.</li>
            <li>
              Want it in another style or on something else?{" "}
              <Link href={`/generate?q=${encodeURIComponent(query)}`} className="text-[var(--acid)] underline">
                Remix it in the studio
              </Link>
              .
            </li>
            <li>Fan-made design, not affiliated with or endorsed by the referenced project.</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="display mb-6 border-b-2 border-[var(--line)] pb-4 text-4xl sm:text-5xl">
            More {query.toUpperCase()}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
