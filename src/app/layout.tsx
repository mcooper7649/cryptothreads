import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";
import { isTestMode } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "CryptoThreads — wear your conviction",
  description:
    "On-demand crypto apparel. Turn any coin into a tee or hoodie — generated from its logo, printed on demand, paid in crypto or card.",
};

// The test-mode banner reads env at request time.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          {isTestMode() && (
            <div className="bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-black">
              Test mode: no real charges. Pay with card 4242 4242 4242 4242, any future date and any CVC.
            </div>
          )}
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
