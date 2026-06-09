"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";

export interface AddToCartProps {
  title: string;
  blankType: string;
  mode: string;
  query: string;
  previewUrl: string;
  priceCents: number;
  sizes: string[];
}

export function AddToCart(props: AddToCartProps) {
  const { add } = useCart();
  const [size, setSize] = useState<string | undefined>(props.sizes[0]);
  const [added, setAdded] = useState(false);

  return (
    <div className="space-y-4">
      {props.sizes.length > 0 && (
        <div>
          <div className="mb-2 text-sm text-white/60">Size</div>
          <div className="flex flex-wrap gap-2">
            {props.sizes.map((s) => (
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
      )}

      <button
        onClick={() => {
          add({
            title: props.title,
            blankType: props.blankType,
            mode: props.mode,
            query: props.query,
            size,
            previewUrl: props.previewUrl,
            priceCents: props.priceCents,
          });
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        className="w-full rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white hover:opacity-90"
      >
        {added ? "Added ✓" : `Add to cart · ${formatPrice(props.priceCents)}`}
      </button>
    </div>
  );
}
