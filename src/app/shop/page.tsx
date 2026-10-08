import Link from "next/link";
import { getActiveCoins, getActiveProducts } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { STYLES, isStyle } from "@/lib/design/styles";
import { BLANKS, BLANK_TYPES, isBlankType } from "@/lib/printful/blanks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop: CryptoThreads" };

type Params = { type?: string; style?: string; coin?: string };

/** Build a shop URL that changes one filter and keeps the others. */
function href(current: Params, change: Params) {
  const next = { ...current, ...change };
  const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
  const s = q.toString();
  return s ? `/shop?${s}` : "/shop";
}

function Chip({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={to} className={`chip ${on ? "chip-on" : ""}`} aria-current={on ? "true" : undefined}>
      {children}
    </Link>
  );
}

export default async function Shop({ searchParams }: { searchParams: Params }) {
  const current: Params = {
    type: isBlankType(searchParams.type) ? searchParams.type : undefined,
    style: isStyle(searchParams.style) ? searchParams.style : undefined,
    coin: searchParams.coin?.toUpperCase().slice(0, 16) || undefined,
  };
  const [products, coins] = await Promise.all([
    getActiveProducts(120, { blankType: current.type, style: current.style, coin: current.coin }),
    getActiveCoins(),
  ]);
  const filtered = Boolean(current.type || current.style || current.coin);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="display text-[clamp(3.5rem,9vw,7rem)]">The shop</h1>
      <p className="mt-2 text-[var(--dim)]">
        {products.length} {products.length === 1 ? "piece" : "pieces"}, all printed on demand.
        Don&apos;t see your coin?{" "}
        <Link href="/generate" className="text-[var(--acid)] underline">Make your own.</Link>
      </p>

      <div className="mt-8 space-y-4 border-y-2 border-[var(--line)] py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label mb-0 mr-2 w-16">Type</span>
          <Chip to={href(current, { type: undefined })} on={!current.type}>All</Chip>
          {BLANK_TYPES.map((t) => (
            <Chip key={t} to={href(current, { type: t })} on={current.type === t}>{BLANKS[t].short}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label mb-0 mr-2 w-16">Style</span>
          <Chip to={href(current, { style: undefined })} on={!current.style}>All</Chip>
          {STYLES.map((s) => (
            <Chip key={s.id} to={href(current, { style: s.id })} on={current.style === s.id}>{s.label}</Chip>
          ))}
        </div>
        {coins.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mb-0 mr-2 w-16">Coin</span>
            <Chip to={href(current, { coin: undefined })} on={!current.coin}>All</Chip>
            {coins.map((c) => (
              <Chip key={c} to={href(current, { coin: c })} on={current.coin === c}>${c}</Chip>
            ))}
          </div>
        )}
      </div>

      {products.length ? (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-10 border-2 border-dashed border-[var(--line)] p-12 text-center">
          <p className="display text-4xl">Nothing in that combo yet</p>
          <p className="mt-2 text-[var(--dim)]">
            {filtered ? (
              <>
                <Link href="/shop" className="text-[var(--acid)] underline">Clear the filters</Link> or{" "}
                <Link href="/generate" className="text-[var(--acid)] underline">make it yourself</Link>.
              </>
            ) : (
              <Link href="/generate" className="text-[var(--acid)] underline">Make the first one.</Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
