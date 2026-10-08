import Link from "next/link";
import { getActiveProducts, getDropNumber } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { STYLES } from "@/lib/design/styles";
import { BLANKS, BLANK_TYPES } from "@/lib/printful/blanks";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const [products, drop] = await Promise.all([getActiveProducts(8), getDropNumber()]);

  return (
    <div>
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
          <h2 className="display text-5xl sm:text-6xl">Fresh off the press</h2>
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
