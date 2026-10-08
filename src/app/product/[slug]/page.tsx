import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice } from "@/lib/format";
import { BLANKS, isBlankType, sizeRank } from "@/lib/printful/blanks";
import { STYLES, getSlogan } from "@/lib/design/styles";

export const dynamic = "force-dynamic";

interface Variant {
  variantId: number;
  size?: string;
  color?: string;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  return { title: product ? `${product.title}: CryptoThreads` : "CryptoThreads" };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || product.status !== "ACTIVE") notFound();
  const related = await getRelatedProducts(product);

  const variants = (product.variants as unknown as Variant[]) ?? [];
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter((s): s is string => !!s))).sort(
    (a, b) => sizeRank(a) - sizeRank(b)
  );
  const images = [...product.mockupUrls, product.design.previewUrl].filter((u): u is string => !!u);
  const blank = isBlankType(product.blankType) ? BLANKS[product.blankType] : null;
  const style = STYLES.find((s) => s.id === product.design.style);
  const slogan = product.design.slogan ? getSlogan(product.design.slogan).lines.join(" ") : null;
  // The coin query used to regenerate the print file at fulfillment time.
  const query = product.query ?? product.design.logo.symbol ?? product.title.replace(/\$/g, "").split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-6 text-sm text-[var(--dim)]">
        <Link href="/shop" className="hover:text-[var(--acid)]">Shop</Link>
        {" / "}
        <Link href={`/shop?coin=${encodeURIComponent(query.toUpperCase())}`} className="hover:text-[var(--acid)]">
          ${query.toUpperCase()}
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
              {blank?.format === "sticker"
                ? "Kiss-cut vinyl sticker with a black backing. Waterproof and laptop-ready."
                : "Printed on a black garment, front print, direct-to-garment."}
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
            More ${query.toUpperCase()}
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
