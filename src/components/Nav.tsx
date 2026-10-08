"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/generate", label: "Make your own" },
  { href: "/blog", label: "Drops" },
];

/** The box logo is the brand mark: red box, white condensed type. */
export function BoxLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-block bg-[var(--red)] px-2.5 pb-0.5 pt-1 text-white ${className}`}>
      CryptoThreads
    </span>
  );
}

export function Nav() {
  const { count } = useCart();
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b-2 border-[var(--line)] bg-[var(--ink)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="CryptoThreads home">
          <BoxLogo className="text-2xl sm:text-3xl" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`display hidden px-1 text-xl sm:inline ${
                path?.startsWith(l.href) ? "text-[var(--acid)]" : "text-[var(--white)] hover:text-[var(--acid)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/shop" className="display px-2 text-xl sm:hidden">Shop</Link>
          <Link
            href="/cart"
            className="display flex items-center gap-2 border-2 border-[var(--white)] px-3 py-1 text-xl hover:bg-[var(--white)] hover:text-[var(--ink)]"
          >
            Bag
            {count > 0 && (
              <span className="grid h-6 min-w-6 place-items-center bg-[var(--acid)] px-1 text-base text-[var(--ink)]">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
