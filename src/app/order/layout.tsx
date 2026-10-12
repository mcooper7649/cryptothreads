import type { Metadata } from "next";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
