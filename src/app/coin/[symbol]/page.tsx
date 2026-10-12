import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getActiveProducts } from "@/lib/queries";
import { getTrending } from "@/lib/slogans";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { abs, coinDisplayName, onSite, SITE_NAME } from "@/lib/seo";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const sym = (raw: string) => decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

async function coinName(symbol: string): Promise<string | null> {
  const logo = await prisma.logoCache.findUnique({ where: { symbol }, select: { name: true } }).catch(() => null);
  return coinDisplayName(symbol, logo?.name);
}

const label = (symbol: string, name: string | null) => (name && name.toUpperCase() !== symbol ? `${name} (${symbol})` : symbol);

export async function generateMetadata({ params }: { params: { symbol: string } }): Promise<Metadata> {
  const symbol = sym(params.symbol);
  const [name, products] = await Promise.all([coinName(symbol), getActiveProducts(1, { coin: symbol })]);
  const who = label(symbol, name);
  const title = `${name ?? symbol} shirts, hoodies & stickers`;
  const description = `Crypto streetwear for ${who} holders: meme tees, hoodies, crewnecks and stickers, printed on demand and shipped in the US. Pay by card or USDC.`;
  const image = onSite(products[0]?.mockupUrls[0]);
  return {
    title,
    description,
    alternates: { canonical: `/coin/${symbol}` },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: `/coin/${symbol}`, ...(image ? { images: [{ url: image }] } : {}) },
    robots: products.length ? undefined : { index: false },
  };
}

/** Landing page per coin: everything we print for it, plus its live memes. */
export default async function CoinPage({ params }: { params: { symbol: string } }) {
  const symbol = sym(params.symbol);
  const [products, name, trending] = await Promise.all([
    getActiveProducts(48, { coin: symbol, sort: "hot" }),
    coinName(symbol),
    getTrending(30),
  ]);
  if (!products.length) notFound();
  const memes = trending.filter((t) => t.ticker === symbol).slice(0, 6);
  const who = label(symbol, name);
  const low = Math.min(...products.map((p) => p.priceCents));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: `${name ?? symbol} merch`,
              url: abs(`/coin/${symbol}`),
              about: name ?? symbol,
              mainEntity: {
                "@type": "ItemList",
                itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/product/${p.slug}`), name: p.title })),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Shop", item: abs("/shop") },
                { "@type": "ListItem", position: 2, name: symbol, item: abs(`/coin/${symbol}`) },
              ],
            },
          ],
        }}
      />
      <nav className="mb-6 text-sm text-[var(--dim)]">
        <Link href="/shop" className="hover:text-[var(--acid)]">Shop</Link> / {symbol}
      </nav>
      <h1 className="display text-[clamp(3.25rem,9vw,7rem)]">{name ?? symbol} merch</h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--dim)]">
        Shirts, hoodies, crewnecks and stickers for {who} holders. {products.length} {products.length === 1 ? "design" : "designs"} from{" "}
        {formatPrice(low)}, each printed on demand after you order and shipped in the US. Want a different meme on it?{" "}
        <Link href={`/generate?q=${encodeURIComponent(symbol)}`} className="text-[var(--acid)] underline">
          Make your own {symbol} shirt
        </Link>
        .
      </p>

      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {memes.length > 0 && (
        <section className="mt-16">
          <h2 className="display mb-6 border-b-2 border-[var(--line)] pb-4 text-4xl sm:text-5xl">{symbol} memes right now</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {memes.map((m) => (
              <Link key={m.id} href={`/generate?q=${symbol}&style=${m.style}&slogan=${m.id}`} className="group block">
                <div className="garment aspect-[5/6] border-2 border-[var(--line)] p-3 group-hover:border-[var(--acid)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(m.previewUrl ?? "").replace(/^https?:\/\/[^/]+/, "")} alt={`${symbol} “${m.lines.join(" ")}” design`} className="h-full w-full object-contain" loading="lazy" />
                </div>
                <div className="display mt-2 text-2xl group-hover:text-[var(--acid)]">{m.lines.join(" ")}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-16 max-w-2xl text-sm text-[var(--dim)]">
        Fan-made designs, not affiliated with or endorsed by the {name ?? symbol} project. Not financial advice. Financial fashion.
      </p>
    </div>
  );
}
