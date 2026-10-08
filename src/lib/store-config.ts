import { SHIPPING_FLAT_CENTS } from "@/lib/printful/blanks";

/** Server-side view of what the store can do right now, driven by env. */
export function paymentProviders(): ("STRIPE" | "COINBASE")[] {
  const out: ("STRIPE" | "COINBASE")[] = [];
  if (process.env.STRIPE_SECRET_KEY) out.push("STRIPE");
  if (process.env.COINBASE_COMMERCE_API_KEY) out.push("COINBASE");
  return out;
}

/** ISO country codes we ship to. Flat shipping is only priced for these. */
export function shipCountries(): string[] {
  return (process.env.SHIP_COUNTRIES || "US")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
}

export const isTestMode = () => (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");

/** Public origin of the store, read at runtime (NEXT_PUBLIC_* would be frozen at build time). */
export const siteUrl = () =>
  (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const supportEmail = () => process.env.SUPPORT_EMAIL || "";

export const shippingCents = () => SHIPPING_FLAT_CENTS;
