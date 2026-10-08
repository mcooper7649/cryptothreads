"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";

export interface AddToCartProps {
  title: string;
  blankType: string;
  mode: string;
  style: string;
  slogan: string | null;
  query: string;
  previewUrl: string;
  priceCents: number;
  sizes: string[];
}

export function AddToCart(props: AddToCartProps) {
  const { add } = useCart();
  const [size, setSize] = useState<string | undefined>(
    props.sizes.includes("M") ? "M" : props.sizes.includes("4″×4″") ? "4″×4″" : props.sizes[0]
  );
  const [added, setAdded] = useState(false);

  return (
    <div className="space-y-6">
      {props.sizes.length > 0 && (
        <fieldset>
          <legend className="label">Size</legend>
          <div className="flex flex-wrap gap-2">
            {props.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`chip min-w-12 ${size === s ? "chip-on" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        className="btn-acid w-full"
        onClick={() => {
          add({
            title: props.title,
            blankType: props.blankType,
            mode: props.mode,
            style: props.style,
            slogan: props.slogan,
            query: props.query,
            size,
            previewUrl: props.previewUrl,
            priceCents: props.priceCents,
          });
          setAdded(true);
          setTimeout(() => setAdded(false), 2500);
        }}
      >
        {added ? "In the bag" : `Add to bag · ${formatPrice(props.priceCents)}`}
      </button>
      {added && (
        <p role="status" className="text-sm text-[var(--dim)]">
          Added.{" "}
          <Link href="/cart" className="text-[var(--acid)] underline">Check out now</Link> or keep shopping.
        </p>
      )}
    </div>
  );
}
