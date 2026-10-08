import Link from "next/link";
import { supportEmail } from "@/lib/store-config";

export function Footer() {
  const email = supportEmail();
  return (
    <footer className="border-t border-[var(--border)] py-10 text-sm text-white/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} CryptoThreads · printed on demand</div>
        <div className="flex gap-5">
          <Link href="/policy/ip" className="hover:text-white">IP & Takedown</Link>
          <Link href="/policy/shipping" className="hover:text-white">Shipping</Link>
          <Link href="/blog" className="hover:text-white">Drops</Link>
          {email && (
            <a href={`mailto:${email}`} className="hover:text-white">Contact</a>
          )}
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-6xl px-4 text-xs text-white/30">
        Designs are fan-made and not affiliated with or endorsed by the projects referenced.
      </p>
    </footer>
  );
}
