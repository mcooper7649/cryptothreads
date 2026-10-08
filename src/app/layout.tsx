import type { Metadata } from "next";
import { Anton, Archivo, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Marquee } from "@/components/Marquee";
import { CartProvider } from "@/components/CartProvider";
import { isTestMode } from "@/lib/store-config";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Archivo({ subsets: ["latin"], variable: "--font-body" });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker" });

export const metadata: Metadata = {
  title: "CryptoThreads: crypto streetwear, printed on demand",
  description:
    "Any coin, any meme. Tees, hoodies, crewnecks and stickers made from your coin's logo, printed on demand. Pay by card or USDC.",
};

// The test-mode banner reads env at request time.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${marker.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          {isTestMode() && (
            <div className="bg-[var(--red)] px-4 py-1.5 text-center text-sm font-bold text-white">
              Test mode: no real charges. Pay with card 4242 4242 4242 4242, any future date and any CVC.
            </div>
          )}
          <Marquee />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
