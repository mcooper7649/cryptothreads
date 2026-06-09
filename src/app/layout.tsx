import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: "CryptoThreads — wear your conviction",
  description:
    "On-demand crypto apparel. Turn any coin into a tee, hoodie, or mug — generated from its logo, printed on demand, paid in crypto or card.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
