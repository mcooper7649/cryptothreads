import Link from "next/link";
import { getActiveProducts } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";

export default async function Home() {
  const products = await getActiveProducts(8);

  return (
    <div>
      {/* Hero */}
      <section className="glow">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="mb-4 inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-widest text-white/60">
            print-on-demand · pay in crypto or card
          </p>
          <h1 className="text-balance text-5xl font-black leading-tight sm:text-6xl">
            Wear your <span className="text-[var(--accent-2)]">conviction</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Paste any coin&apos;s ticker or website and we&apos;ll spin up apparel from its
            logo — instantly. Printed and shipped on demand. No inventory, no minimums.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/generate"
              className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white hover:opacity-90"
            >
              Design yours →
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-[var(--border)] px-6 py-3 font-semibold hover:border-white/40"
            >
              Browse drops
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Latest drops</h2>
          <Link href="/shop" className="text-sm text-white/60 hover:text-white">View all →</Link>
        </div>
        {products.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-white/50">
            No drops yet. Be the first —{" "}
            <Link href="/generate" className="text-[var(--accent-2)] underline">design one in the studio</Link>.
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["1 · Pick a coin", "Type a ticker (BTC) or paste a project URL. We fetch the logo automatically."],
            ["2 · We generate", "A print-ready design is composed instantly — stylized ticker art or the exact logo."],
            ["3 · Printed & shipped", "Pay in crypto or card. It's printed on demand and shipped straight to you."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
              <div className="font-semibold text-[var(--accent-2)]">{t}</div>
              <p className="mt-2 text-sm text-white/60">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
