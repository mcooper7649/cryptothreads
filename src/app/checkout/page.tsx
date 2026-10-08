import { CheckoutClient } from "@/components/CheckoutClient";
import { checkoutOpen, shipCountries, shippingCents } from "@/lib/store-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout — CryptoThreads" };

export default function CheckoutPage() {
  return (
    <CheckoutClient open={checkoutOpen()} countries={shipCountries()} shippingCents={shippingCents()} />
  );
}
