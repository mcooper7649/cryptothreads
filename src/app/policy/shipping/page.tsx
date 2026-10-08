import { formatPrice } from "@/lib/format";
import { shipCountries, shippingCents, supportEmail } from "@/lib/store-config";

export const metadata = { title: "Shipping & Returns — CryptoThreads" };
export const dynamic = "force-dynamic";

export default function ShippingPolicy() {
  const countries = shipCountries();
  const email = supportEmail();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 leading-relaxed text-[var(--white)]">
      <h1 className="display text-6xl">Shipping &amp; Returns</h1>
      <p className="mt-6">
        Every item is printed on demand by our fulfillment partner, Printful, after your
        order is placed. Production usually takes 2–5 business days, then shipping
        takes 3–8 business days.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>
          We currently ship to: {countries.join(", ")}. Shipping is a flat{" "}
          {formatPrice(shippingCents())} per order.
        </li>
        <li>You get a receipt by email when you pay, and tracking once the order ships.</li>
        <li>
          Because items are made to order, we can&apos;t accept returns for size or a change
          of mind. If an item arrives damaged, misprinted or wrong, send a photo within 30
          days of delivery and we&apos;ll reprint it or refund you in full.
        </li>
        <li>
          {email ? (
            <>
              Questions or problems: <a className="underline" href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            "Questions or problems: use the contact link in the footer."
          )}
        </li>
      </ul>
    </div>
  );
}
