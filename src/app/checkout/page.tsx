import Link from "next/link";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-black">Checkout</h1>
      <p className="mt-4 text-white/60">
        Card (Stripe) and crypto (Coinbase Commerce) checkout are being wired up. Your cart
        is saved — come back shortly.
      </p>
      <Link href="/cart" className="mt-8 inline-block text-[var(--accent-2)] underline">
        ← Back to cart
      </Link>
    </div>
  );
}
