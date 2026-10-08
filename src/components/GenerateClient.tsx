"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";
import { BLANKS, BLANK_TYPES, type BlankType } from "@/lib/printful/blanks";
import { DEFAULT_STYLE, STYLES, slogansFor, styleUsesSlogan, type StyleId } from "@/lib/design/styles";

const APPAREL_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const STICKER_SIZES = ["3″×3″", "4″×4″", "5.5″×5.5″"];
const EXAMPLES = ["BTC", "DOGE", "ETH", "SOL", "PEPE", "uniswap.org"];

interface Preview {
  ticker: string;
  name: string | null;
  found: boolean;
  source: string | null;
  previewDataUri: string;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-[var(--line)] pt-5">
      <h2 className="display mb-4 flex items-baseline gap-3 text-3xl">
        <span className="text-[var(--acid)]">{n}</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function GenerateClient({ initialQuery = "", initialStyle }: { initialQuery?: string; initialStyle?: StyleId }) {
  const { add } = useCart();
  const [query, setQuery] = useState(initialQuery);
  const [style, setStyle] = useState<StyleId>(initialStyle ?? DEFAULT_STYLE);
  const [slogan, setSlogan] = useState<string>("hodl");
  const [blank, setBlank] = useState<BlankType>("tee");
  const [size, setSize] = useState("M");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const seq = useRef(0);

  const sticker = BLANKS[blank].format === "sticker";
  const sizes = sticker ? STICKER_SIZES : APPAREL_SIZES;
  const withSlogan = styleUsesSlogan(style);
  const slogans = slogansFor(preview?.ticker);

  useEffect(() => {
    if (!sizes.includes(size)) setSize(sticker ? "4″×4″" : "M");
  }, [sticker, sizes, size]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPreview(null);
      setError(null);
      return;
    }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q, style, blank, ...(withSlogan ? { slogan } : {}) });
        const res = await fetch(`/api/design/preview?${params}`);
        const data = await res.json();
        if (id !== seq.current) return;
        if (!res.ok) {
          setError(data?.message || "Couldn't render that. Try a ticker like BTC.");
          setPreview(null);
        } else {
          setPreview(data);
        }
      } catch {
        if (id === seq.current) setError("Network hiccup. Try again.");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // Garment changes only matter when switching between apparel and sticker formats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, style, slogan, sticker]);

  const price = BLANKS[blank].priceCents;
  const styleLabel = STYLES.find((s) => s.id === style)!.label;
  const sloganLabel = withSlogan ? slogans.find((s) => s.id === slogan)?.lines.join(" ") : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr]">
      <div className="space-y-8">
        <Step n={1} title="Pick a coin">
          <label htmlFor="coin" className="sr-only">Coin ticker or website</label>
          <input
            id="coin"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="DOGE, ethereum, or uniswap.org"
            autoComplete="off"
            className="field display py-3 text-3xl"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} type="button" className="chip" onClick={() => setQuery(e)}>{e}</button>
            ))}
          </div>
          <p className="mt-3 min-h-5 text-sm text-[var(--dim)]" aria-live="polite">
            {error ? (
              <span className="text-[var(--red)]">{error}</span>
            ) : preview ? (
              preview.found
                ? `Found $${preview.ticker}${preview.name ? ` (${preview.name})` : ""}.`
                : `No logo found for $${preview.ticker}, so it prints as type only. Still slaps.`
            ) : null}
          </p>
        </Step>

        <Step n={2} title="Pick a style">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                aria-pressed={style === s.id}
                className={`group border-2 p-1.5 text-left transition-colors ${
                  style === s.id ? "border-[var(--acid)] bg-[var(--ink-2)]" : "border-[var(--line)] hover:border-[var(--white)]"
                }`}
              >
                <span className="garment block aspect-[5/6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/style-${s.id}.png`} alt="" className="h-full w-full object-contain" />
                </span>
                <span className={`display mt-1.5 block text-lg ${style === s.id ? "text-[var(--acid)]" : ""}`}>{s.label}</span>
              </button>
            ))}
          </div>
        </Step>

        {withSlogan && (
          <Step n={3} title="Pick a meme">
            <div className="flex flex-wrap gap-2">
              {slogans.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlogan(s.id)}
                  aria-pressed={slogan === s.id}
                  className={`chip ${slogan === s.id ? "chip-on" : ""} ${s.coins ? "border-dashed" : ""}`}
                  title={s.coins ? `$${s.coins[0]} special` : undefined}
                >
                  {s.lines.join(" ")}
                </button>
              ))}
            </div>
          </Step>
        )}

        <Step n={withSlogan ? 4 : 3} title="Pick a product">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BLANK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBlank(t)}
                aria-pressed={blank === t}
                className={`flex items-center justify-between gap-2 border-2 px-3 py-2.5 text-left ${
                  blank === t ? "border-[var(--acid)] bg-[var(--acid)] text-[var(--ink)]" : "border-[var(--line)] hover:border-[var(--white)]"
                }`}
              >
                <span className="display text-xl">{BLANKS[t].label}</span>
                <span className="text-sm font-bold">{formatPrice(BLANKS[t].priceCents)}</span>
              </button>
            ))}
          </div>
          <fieldset className="mt-5">
            <legend className="label">Size</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)} aria-pressed={size === s} className={`chip min-w-12 ${size === s ? "chip-on" : ""}`}>
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        </Step>
      </div>

      {/* Live preview, sticky on desktop */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="garment relative aspect-[5/6] border-2 border-[var(--line)]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.previewDataUri}
              alt={`$${preview.ticker} ${styleLabel} design`}
              className={`h-full w-full object-contain p-6 transition-opacity ${loading ? "opacity-40" : ""}`}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
              <p className="display text-5xl text-[var(--line)]">{loading ? "Printing…" : "Your design shows up here"}</p>
              {!loading && <p className="text-[var(--dim)]">Start by typing a coin on the left.</p>}
            </div>
          )}
          {loading && preview && (
            <span className="display absolute right-3 top-3 bg-[var(--acid)] px-2 text-lg text-[var(--ink)]">Rendering</span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="display text-2xl">
              {preview ? `$${preview.ticker}` : "Your coin"} · {styleLabel} {BLANKS[blank].label}
            </p>
            {sloganLabel && <p className="text-sm text-[var(--dim)]">&ldquo;{sloganLabel}&rdquo; · size {size}</p>}
          </div>
          <span className="price-tag text-3xl">{formatPrice(price)}</span>
        </div>
        <button
          type="button"
          disabled={!preview || loading}
          className="btn-acid mt-5 w-full"
          onClick={() => {
            if (!preview) return;
            add({
              title: `$${preview.ticker}${sloganLabel ? ` “${sloganLabel}”` : ""} ${styleLabel} ${BLANKS[blank].label}`,
              blankType: blank,
              mode: "STYLIZED",
              style,
              slogan: withSlogan ? slogan : null,
              query: query.trim(),
              size,
              previewUrl: preview.previewDataUri,
              priceCents: price,
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 3000);
          }}
        >
          {added ? "In the bag" : `Add to bag · ${formatPrice(price)}`}
        </button>
        {added && (
          <p role="status" className="mt-3 text-sm text-[var(--dim)]">
            Added. <Link href="/cart" className="text-[var(--acid)] underline">Check out</Link> or make another.
          </p>
        )}
      </div>
    </div>
  );
}
