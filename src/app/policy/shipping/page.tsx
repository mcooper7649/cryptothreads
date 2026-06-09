export const metadata = { title: "Shipping — CryptoThreads" };

export default function ShippingPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 leading-relaxed text-white/80">
      <h1 className="text-3xl font-black text-white">Shipping &amp; Returns</h1>
      <p className="mt-6">
        Every item is printed on demand by our fulfillment partner after your order is
        placed. Typical production time is 2–5 business days, plus shipping.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>Worldwide shipping, calculated at checkout by destination.</li>
        <li>Tracking is emailed once your order ships.</li>
        <li>
          Because items are made to order, we accept returns only for defects or printing
          errors — reach out with a photo and we&apos;ll reprint or refund.
        </li>
      </ul>
    </div>
  );
}
