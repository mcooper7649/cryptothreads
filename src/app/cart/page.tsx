"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/format";
import { BLANKS, isBlankType } from "@/lib/printful/blanks";

export default function CartPage() {
  const { items, subtotalCents, setQty, remove } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="display text-7xl">Bag&apos;s empty</h1>
        <p className="mt-3 text-[var(--dim)]">Down bad? Fix that.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/shop" className="btn-acid">Shop the drop</Link>
          <Link href="/generate" className="btn-ghost">Make your own</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="display text-[clamp(3.5rem,9vw,6rem)]">Your bag</h1>
      <ul className="mt-8 divide-y-2 divide-[var(--line)] border-y-2 border-[var(--line)]">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-4 py-4">
            <div className="garment h-24 w-24 shrink-0 border-2 border-[var(--line)]">
              {it.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.previewUrl} alt="" className="h-full w-full object-contain p-1" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="display line-clamp-2 text-xl">{it.title}</p>
              <p className="text-sm text-[var(--dim)]">
                {isBlankType(it.blankType) ? BLANKS[it.blankType].label : it.blankType}
                {it.size ? ` · ${it.size}` : ""}
              </p>
              <button type="button" onClick={() => remove(it.id)} className="mt-1 text-sm text-[var(--dim)] underline hover:text-[var(--red)]">
                Remove
              </button>
            </div>
            <label className="sr-only" htmlFor={`qty-${it.id}`}>Quantity</label>
            <input
              id={`qty-${it.id}`}
              type="number"
              min={1}
              max={20}
              value={it.qty}
              onChange={(e) => setQty(it.id, parseInt(e.target.value || "1", 10))}
              className="field w-16 text-center"
            />
            <span className="w-20 text-right font-bold">{formatPrice(it.priceCents * it.qty)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-end gap-2">
        <p className="text-[var(--dim)]">
          Subtotal <span className="price-tag ml-2 text-2xl">{formatPrice(subtotalCents)}</span>
        </p>
        <p className="text-sm text-[var(--dim)]">Plus $5 flat shipping (US). Card or USDC on the next step.</p>
        <Link href="/checkout" className="btn-acid mt-4 w-full sm:w-auto">Check out</Link>
      </div>
    </div>
  );
}
