"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";

const BLANKS = [
  { type: "tee", label: "T-Shirt", priceCents: 2999 },
  { type: "hoodie", label: "Hoodie", priceCents: 5499 },
] as const;

const SIZES = ["S", "M", "L", "XL", "2XL"];

interface Preview {
  ticker: string;
  name: string | null;
  accent: string;
  found: boolean;
  source: string | null;
  previewDataUri: string;
}

export function GenerateClient() {
  const { add } = useCart();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"STYLIZED" | "EXACT">("STYLIZED");
  const [blank, setBlank] = useState<(typeof BLANKS)[number]>(BLANKS[0]);
  const [size, setSize] = useState("M");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

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
        const res = await fetch(
          `/api/design/preview?q=${encodeURIComponent(q)}&mode=${mode}`
        );
        const data = await res.json();
        if (id !== seq.current) return; // stale
        if (!res.ok) {
          setError(data?.message || "preview failed");
          setPreview(null);
        } else {
          setPreview(data);
        }
      } catch {
        if (id === seq.current) setError("network error");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query, mode]);

  const canAdd = !!preview;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Controls */}
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm text-white/60">Coin ticker or website</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BTC, ethereum, or uniswap.org"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-lg outline-none focus:border-[var(--accent)]"
          />
          {preview && (
            <div className="mt-2 text-xs text-white/50">
              {preview.found
                ? `logo via ${preview.source} · $${preview.ticker}${preview.name ? ` · ${preview.name}` : ""}`
                : `no logo found — using text-only design for $${preview.ticker}`}
            </div>
          )}
          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        </div>

        <div>
          <div className="mb-2 text-sm text-white/60">Style</div>
          <div className="flex gap-2">
            {(["STYLIZED", "EXACT"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  mode === m
                    ? "border-[var(--accent)] bg-[var(--accent)]/20"
                    : "border-[var(--border)] hover:border-white/40"
                }`}
              >
                {m === "STYLIZED" ? "Stylized" : "Exact logo"}
              </button>
            ))}
          </div>
          {mode === "EXACT" && (
            <p className="mt-2 text-xs text-amber-400/80">
              Exact-logo prints are only fulfilled for projects on our cleared list; others
              fall back to stylized at checkout.
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm text-white/60">Product</div>
          <div className="flex gap-2">
            {BLANKS.map((b) => (
              <button
                key={b.type}
                onClick={() => setBlank(b)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  blank.type === b.type
                    ? "border-[var(--accent)] bg-[var(--accent)]/20"
                    : "border-[var(--border)] hover:border-white/40"
                }`}
              >
                {b.label} · {formatPrice(b.priceCents)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-white/60">Size</div>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  size === s
                    ? "border-[var(--accent)] bg-[var(--accent)]/20"
                    : "border-[var(--border)] hover:border-white/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!canAdd}
          onClick={() =>
            preview &&
            add({
              title: `${preview.name ?? "$" + preview.ticker} ${blank.label}`,
              blankType: blank.type,
              mode,
              query: query.trim(),
              size,
              previewUrl: preview.previewDataUri,
              priceCents: blank.priceCents,
            })
          }
          className="w-full rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white enabled:hover:opacity-90 disabled:opacity-40"
        >
          Add to cart · {formatPrice(blank.priceCents)}
        </button>
      </div>

      {/* Live preview */}
      <div className="checkerboard flex aspect-square items-center justify-center rounded-2xl border border-[var(--border)]">
        {loading ? (
          <div className="animate-pulse text-white/40">rendering…</div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.previewDataUri}
            alt={`${preview.ticker} design`}
            className="h-full w-full object-contain p-6"
          />
        ) : (
          <div className="px-8 text-center text-white/30">
            Type a ticker or paste a project URL to see your design appear here.
          </div>
        )}
      </div>
    </div>
  );
}
