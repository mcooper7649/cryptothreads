"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function Nav() {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(7,7,11,0.8)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="text-xl">⛓️</span>
          <span className="text-lg">
            Crypto<span className="text-[var(--accent-2)]">Threads</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/shop" className="text-white/80 hover:text-white">Shop</Link>
          <Link href="/generate" className="text-white/80 hover:text-white">Design Studio</Link>
          <Link href="/blog" className="text-white/80 hover:text-white">Drops</Link>
          <Link
            href="/cart"
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-white hover:border-[var(--accent)]"
          >
            Cart{count > 0 ? ` · ${count}` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}
