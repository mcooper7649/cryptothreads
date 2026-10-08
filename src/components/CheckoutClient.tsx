"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/format";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
};

interface Props {
  open: boolean;
  countries: string[];
  shippingCents: number;
}

export function CheckoutClient({ open, countries, shippingCents: SHIPPING_CENTS }: Props) {
  const { items, subtotalCents } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    address1: "",
    address2: "",
    city: "",
    state_code: "",
    country_code: countries[0] ?? "US",
    zip: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="display text-6xl">Nothing to check out</h1>
        <Link href="/shop" className="btn-acid mt-8">Shop the drop</Link>
      </div>
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          shipping: {
            name: form.name,
            address1: form.address1,
            address2: form.address2 || undefined,
            city: form.city,
            state_code: form.state_code || undefined,
            country_code: form.country_code,
            zip: form.zip,
          },
          items: items.map((i) => ({
            query: i.query,
            blankType: i.blankType,
            mode: i.mode,
            style: i.style,
            slogan: i.slogan ?? undefined,
            size: i.size,
            qty: i.qty,
            title: i.title,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "checkout failed");
      window.location.href = data.url; // redirect to the Stripe-hosted payment page
    } catch (e: any) {
      setError(e?.message || "checkout failed");
      setSubmitting(false);
    }
  }

  const total = subtotalCents + SHIPPING_CENTS;
  const fld = "field";

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="display mb-6 text-[clamp(3rem,8vw,5rem)]">Check out</h1>

        <div className="space-y-3">
          <input className={fld} placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <input className={fld} placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <input className={fld} placeholder="Address" value={form.address1} onChange={(e) => set("address1", e.target.value)} />
          <input className={fld} placeholder="Apt, suite (optional)" value={form.address2} onChange={(e) => set("address2", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className={fld} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <input className={fld} placeholder="State (e.g. CA)" value={form.state_code} onChange={(e) => set("state_code", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={fld} placeholder="ZIP / postal" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
            <select className={fld} aria-label="Country" value={form.country_code} onChange={(e) => set("country_code", e.target.value)}>
              {countries.map((c) => (
                <option key={c} value={c}>{COUNTRY_NAMES[c] ?? c}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-6 text-sm text-[var(--dim)]">
          On the next page, pay by card, Apple Pay or Google Pay, or in crypto with USDC
          (Ethereum, Base, Polygon or Solana).
        </p>

        {!open && (
          <div className="mt-4 text-sm text-[var(--acid)]">
            Checkout isn&apos;t open yet. Your cart is saved, so come back soon.
          </div>
        )}
        {error && <div className="mt-4 text-sm text-[var(--red)]">{error}</div>}
      </div>

      <aside className="h-fit border-2 border-[var(--line)] bg-[var(--ink-2)] p-5">
        <h2 className="display mb-4 text-3xl">Your bag</h2>
        <div className="space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between text-[var(--white)]">
              <span className="truncate pr-2">{i.qty}× {i.title}</span>
              <span>{formatPrice(i.priceCents * i.qty)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t-2 border-[var(--line)] pt-4 text-sm">
          <div className="flex justify-between text-[var(--dim)]"><span>Subtotal</span><span>{formatPrice(subtotalCents)}</span></div>
          <div className="flex justify-between text-[var(--dim)]"><span>Shipping</span><span>{formatPrice(SHIPPING_CENTS)}</span></div>
          <div className="mt-2 flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>
        </div>
        <button
          onClick={submit}
          disabled={submitting || !open}
          className="btn-acid mt-5 w-full"
        >
          {submitting ? "Redirecting…" : `Continue to payment · ${formatPrice(total)}`}
        </button>
        <p className="mt-3 text-center text-xs text-[var(--dim)]">
          Secure checkout via Stripe.
        </p>
      </aside>
    </div>
  );
}
