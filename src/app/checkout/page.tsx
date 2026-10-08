import { CheckoutClient } from "@/components/CheckoutClient";
import { paymentProviders, shipCountries, shippingCents } from "@/lib/store-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout — CryptoThreads" };

export default function CheckoutPage() {
  return (
    <CheckoutClient providers={paymentProviders()} countries={shipCountries()} shippingCents={shippingCents()} />
  );
}
