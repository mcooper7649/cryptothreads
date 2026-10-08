"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function OrderSuccess() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
            <h1 className="display text-7xl">Bags secured</h1>
      <p className="mt-4 text-[var(--dim)]">
        Thanks! Your receipt is on its way by email. We&apos;re printing your order now and
        you&apos;ll get tracking by email once it ships.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/shop" className="btn-ghost">
          Keep shopping
        </Link>
        <Link href="/generate" className="btn-acid">
          Make another
        </Link>
      </div>
    </div>
  );
}
