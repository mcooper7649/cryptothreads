import Link from "next/link";
import { supportEmail } from "@/lib/store-config";

export function Footer() {
  const email = supportEmail();
  return (
    <footer className="mt-24 border-t-2 border-[var(--line)]">
      <div
        aria-hidden="true"
        className="display select-none overflow-hidden whitespace-nowrap pt-6 text-[22vw] leading-[0.8] text-transparent"
        style={{ WebkitTextStroke: "2px #2b2b2b" }}
      >
        WAGMI
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md text-sm text-[var(--dim)]">
          <p>
            Printed on demand by Printful and shipped to the US for a flat $5. Designs are fan-made
            and not affiliated with or endorsed by the projects referenced. Nothing here is
            financial advice. It&apos;s a shirt.
          </p>
          <p className="mt-3">© {new Date().getFullYear()} CryptoThreads</p>
        </div>
        <nav className="display flex flex-wrap gap-x-6 gap-y-2 text-xl">
          <Link href="/shop" className="hover:text-[var(--acid)]">Shop</Link>
          <Link href="/generate" className="hover:text-[var(--acid)]">Make your own</Link>
          <Link href="/blog" className="hover:text-[var(--acid)]">Drops</Link>
          <Link href="/policy/shipping" className="hover:text-[var(--acid)]">Shipping &amp; returns</Link>
          <Link href="/policy/ip" className="hover:text-[var(--acid)]">IP &amp; takedown</Link>
          {email && <a href={`mailto:${email}`} className="hover:text-[var(--acid)]">Contact</a>}
        </nav>
      </div>
    </footer>
  );
}
