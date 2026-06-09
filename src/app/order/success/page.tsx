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
      <div className="text-5xl">🎉</div>
      <h1 className="mt-4 text-3xl font-black">Order placed</h1>
      <p className="mt-4 text-white/60">
        Thanks! We&apos;re generating your print file and sending it to production. You&apos;ll
        get a confirmation email with tracking once it ships.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/shop" className="rounded-full border border-[var(--border)] px-6 py-3 hover:border-white/40">
          Keep shopping
        </Link>
        <Link href="/generate" className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold">
          Design another →
        </Link>
      </div>
    </div>
  );
}
