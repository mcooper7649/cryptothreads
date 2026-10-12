import Link from "next/link";
import { getActiveProducts, getDropNumber } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { STYLES } from "@/lib/design/styles";
import { BLANKS, BLANK_TYPES } from "@/lib/printful/blanks";
import { formatPrice } from "@/lib/format";
import { TIMELINE, TIMELINE_AS_OF } from "@/lib/timeline";
import { getSlogan } from "@/lib/design/styles";
import { getTrending } from "@/lib/slogans";
import { upcomingEvents } from "@/lib/events";
import { JsonLd } from "@/components/JsonLd";
import { abs, SITE_NAME } from "@/lib/seo";

/** Asset URLs are stored absolute (SITE_URL); serve them same-origin so they work behind any host. */
const sameOrigin = (u: string | null) => (u ? u.replace(/^https?:\/\/[^/]+/, "") : "");

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

// Sticker-bomb layout: position (% of the pile), rotation, size, stacking.
const PILE = [
  { left: 2, top: 4, rot: -12, w: 46, z: 2 },
  { left: 48, top: 0, rot: 9, w: 40, z: 3 },
  { left: 26, top: 28, rot: -4, w: 48, z: 6 },
  { left: 60, top: 34, rot: 14, w: 38, z: 4 },
  { left: 0, top: 50, rot: 7, w: 40, z: 5 },
  { left: 40, top: 58, rot: -15, w: 36, z: 7 },
  { left: 66, top: 66, rot: -6, w: 32, z: 8 },
  { left: 14, top: 76, rot: 16, w: 30, z: 9 },
];

const BADGE: Record<string, string> = { event: "On the calendar", community: "Community pick", dex: "New coin" };
const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function Home() {
  const coming = upcomingEvents(4);
  const [products, drop, live] = await Promise.all([getActiveProducts(8, { sort: "hot" }), getDropNumber(), getTrending(6)]);
  // Live trending slogans when the collector has found enough, else the hand-picked set.
  const trending =
    live.length >= 3
      ? {
          live: true,
          items: live.map((t) => ({
            slogan: t.id,
            ticker: t.ticker,
            style: t.style,
            text: t.lines.join(" "),
            seen: t.blurb,
            image: sameOrigin(t.previewUrl),
            badge: BADGE[t.source] ?? null,
          })),
        }
      : {
          live: false,
          items: TIMELINE.map((m, i) => ({
            slogan: m.slogan,
            ticker: m.ticker,
            style: m.style,
            text: getSlogan(m.slogan).lines.join(" "),
            seen: m.seen,
            image: `/brand/meme-${i}.png`,
            badge: null as string | null,
          })),
        };

  return (
    // Clip sideways: the tilted disclaimer band pokes past the viewport on phones.
    <div className="overflow-x-clip">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "OnlineStore",
              "@id": abs("/#store"),
              name: SITE_NAME,
              url: abs("/"),
              logo: abs("/og.jpg"),
              description: "Crypto streetwear, printed on demand. Any coin, any meme.",
              currenciesAccepted: "USD",
              paymentAccepted: "Credit card, USDC",
            },
            { "@type": "WebSite", "@id": abs("/#site"), name: SITE_NAME, url: abs("/"), publisher: { "@id": abs("/#store") } },
          ],
        }}
      />
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <span className="display inline-block -rotate-2 bg-[var(--red)] px-3 py-1 text-xl text-white">
            Drop {String(drop).padStart(3, "0")} · live now
          </span>
          <h1 className="display mt-5 text-[clamp(4.5rem,13vw,11rem)]">
            Number
            <br />
            go up.
          </h1>
          <p className="mt-6 max-w-md text-lg text-[var(--dim)]">
            Crypto streetwear, printed on demand. Pick any coin, pick a meme, and we print it on a
            black tee, hoodie or sticker. Pay by card or USDC.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/shop" className="btn-acid">Shop the drop</Link>
            <Link href="/generate" className="btn-ghost">Make your own</Link>
          </div>
          <p className="marker mt-8 -rotate-2 text-xl text-[var(--acid)]">
            ser, this is a t-shirt store.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[560px]" aria-hidden="true">
          {PILE.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`/brand/sticker-${i}.png`}
              alt=""
              className="absolute drop-shadow-[0_10px_18px_rgba(0,0,0,0.7)]"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.w}%`, transform: `rotate(${s.rot}deg)`, zIndex: s.z }}
            />
          ))}
        </div>
      </section>

      {/* Latest products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between gap-4 border-b-2 border-[var(--line)] pb-4">
          <h2 className="display text-5xl sm:text-6xl">Hot off the press</h2>
          <Link href="/shop" className="display shrink-0 text-xl text-[var(--acid)] hover:underline">
            Shop all
          </Link>
        </div>
        {products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="border-2 border-dashed border-[var(--line)] p-12 text-center text-[var(--dim)]">
            The rack is empty.{" "}
            <Link href="/generate" className="text-[var(--acid)] underline">Make the first one.</Link>
          </p>
        )}
      </section>

      {/* Trending memes: auto-published daily by the trend collector; each opens in the studio ready to buy */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between gap-4 border-b-2 border-[var(--line)] pb-4">
          <div>
            <h2 className="display text-5xl sm:text-6xl">Trending</h2>
            <p className="mt-2 text-[var(--dim)]">
              {trending.live
                ? "Pulled from crypto X, Reddit and the DEX charts, refreshed three times a day. Tap one to put it on a shirt, or swap in your own coin."
                : `What crypto X was posting in ${TIMELINE_AS_OF}. Tap one to put it on a shirt, or swap in your own coin.`}
            </p>
          </div>
          <Link href="/generate?style=slogan#trending" className="display shrink-0 text-xl text-[var(--acid)] hover:underline">
            All memes
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {trending.items.map((m) => (
            <Link
              key={m.slogan}
              href={`/generate?q=${m.ticker}&style=${m.style}&slogan=${m.slogan}`}
              className="group block"
            >
              <div className="garment aspect-[5/6] border-2 border-[var(--line)] p-3 transition-colors group-hover:border-[var(--acid)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.image}
                  alt={`${m.ticker} “${m.text}” design`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="display mt-2 text-2xl group-hover:text-[var(--acid)]">{m.text}</div>
              {m.badge && (
                <span className="mt-1 inline-block bg-[var(--acid)] px-1.5 text-xs font-bold uppercase text-[var(--ink)]">{m.badge}</span>
              )}
              <p className="text-sm text-[var(--dim)]">{m.seen}</p>
            </Link>
          ))}
        </div>

        {/* Coming up: the crypto calendar; each date's design goes live a week or two before */}
        {coming.length > 0 && (
          <div className="mt-12">
            <h3 className="display mb-4 text-3xl">Coming up</h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {coming.map((w) => {
                const live = w.showFrom <= new Date();
                return (
                  <li key={w.event.key} className="flex items-baseline gap-3 border-2 border-[var(--line)] px-4 py-3">
                    <span className="display shrink-0 text-2xl text-[var(--acid)]">{fmtDay(w.start)}</span>
                    <span className="min-w-0">
                      <span className="block font-bold">{w.event.name}</span>
                      <span className="block text-sm text-[var(--dim)]">
                        {live ? "Design is live above." : `Design drops ${fmtDay(w.showFrom)}.`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-2 border-dashed border-[var(--line)] p-6">
          <p className="marker -rotate-1 text-2xl text-[var(--acid)]">your coin deserves a shirt.</p>
          <Link href="/shill" className="btn-ghost">Shill us yours</Link>
        </div>
      </section>

      {/* Styles */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 border-b-2 border-[var(--line)] pb-4">
          <h2 className="display text-5xl sm:text-6xl">Pick your poison</h2>
          <p className="mt-2 text-[var(--dim)]">Seven print styles. Any coin goes in any of them.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {STYLES.map((s) => (
            <Link key={s.id} href={`/generate?style=${s.id}`} className="group block">
              <div className="garment aspect-[5/6] border-2 border-[var(--line)] p-2 transition-colors group-hover:border-[var(--acid)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/brand/style-${s.id}.png`} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="display mt-2 text-2xl group-hover:text-[var(--acid)]">{s.label}</div>
              <p className="text-sm text-[var(--dim)]">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Disclaimer band, as a joke */}
      <section className="my-12 -rotate-1 bg-[var(--red)] py-8 text-white">
        <p className="display mx-auto max-w-7xl px-4 text-[clamp(2.5rem,7vw,6rem)]">
          Not financial advice. Financial fashion.
        </p>
      </section>

      {/* How it works: a real sequence */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="display mb-8 border-b-2 border-[var(--line)] pb-4 text-5xl sm:text-6xl">How it works</h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {[
            ["Pick a coin", "Type a ticker like DOGE or paste a project's website. We find the logo."],
            ["Pick a meme", "Choose a style and a slogan. The design renders live while you choose."],
            ["Wear your bags", "Printful prints it after you pay and ships it to you. Nothing sits in a warehouse."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="display text-7xl text-[var(--acid)]">{i + 1}</span>
              <div>
                <h3 className="display text-3xl">{t}</h3>
                <p className="mt-1 text-[var(--dim)]">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* The rack */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="display mb-6 border-b-2 border-[var(--line)] pb-4 text-5xl sm:text-6xl">The rack</h2>
        <ul className="grid grid-cols-2 gap-px border-2 border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-6">
          {BLANK_TYPES.map((t) => (
            <li key={t}>
              <Link href={`/shop?type=${t}`} className="flex h-full flex-col justify-between gap-6 bg-[var(--ink)] p-4 hover:bg-[var(--ink-2)]">
                <span className="display text-2xl">{BLANKS[t].label}</span>
                <span className="price-tag self-start">{formatPrice(BLANKS[t].priceCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
