"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, subtotalCents, setQty, remove } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-black">Your cart is empty</h1>
        <Link
          href="/generate"
          className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 font-semibold"
        >
          Design something →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-black">Cart</h1>
      <div className="space-y-4">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3"
          >
            <div className="checkerboard h-20 w-20 shrink-0 overflow-hidden rounded-lg">
              {it.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.previewUrl} alt={it.title} className="h-full w-full object-contain" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{it.title}</div>
              <div className="text-xs uppercase tracking-wide text-white/40">
                {it.blankType}
                {it.size ? ` · ${it.size}` : ""} · {it.mode.toLowerCase()}
              </div>
              <button
                onClick={() => remove(it.id)}
                className="mt-1 text-xs text-white/40 hover:text-red-400"
              >
                Remove
              </button>
            </div>
            <input
              type="number"
              min={1}
              value={it.qty}
              onChange={(e) => setQty(it.id, parseInt(e.target.value || "1", 10))}
              className="w-14 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-center"
            />
            <div className="w-20 text-right text-[var(--accent-2)]">
              {formatPrice(it.priceCents * it.qty)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
        <span className="text-white/60">Subtotal</span>
        <span className="text-2xl font-bold">{formatPrice(subtotalCents)}</span>
      </div>
      <Link
        href="/checkout"
        className="mt-6 block rounded-full bg-[var(--accent)] px-6 py-4 text-center font-semibold text-white hover:opacity-90"
      >
        Checkout →
      </Link>
      <p className="mt-3 text-center text-xs text-white/40">
        Flat $5 shipping. Pay at checkout.
      </p>
    </div>
  );
}
