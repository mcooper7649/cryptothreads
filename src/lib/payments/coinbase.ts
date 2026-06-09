import crypto from "crypto";

const BASE = "https://api.commerce.coinbase.com";
const VERSION = "2018-03-22";

function headers(): HeadersInit {
  const key = process.env.COINBASE_COMMERCE_API_KEY;
  if (!key) throw new Error("COINBASE_COMMERCE_API_KEY not set");
  return {
    "Content-Type": "application/json",
    "X-CC-Api-Key": key,
    "X-CC-Version": VERSION,
  };
}

/** Create a fixed-price hosted charge. Returns the hosted checkout URL + code. */
export async function createCoinbaseCharge(opts: {
  orderId: string;
  amountCents: number;
  name: string;
  description: string;
  redirectUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; code: string }> {
  const res = await fetch(`${BASE}/charges`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: opts.name,
      description: opts.description,
      pricing_type: "fixed_price",
      local_price: { amount: (opts.amountCents / 100).toFixed(2), currency: "USD" },
      metadata: { orderId: opts.orderId },
      redirect_url: opts.redirectUrl,
      cancel_url: opts.cancelUrl,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`coinbase charge failed: ${json?.error?.message || res.status}`);
  }
  const data = json.data;
  return { url: data.hosted_url, code: data.code };
}

/** Verify the X-CC-Webhook-Signature header (HMAC-SHA256 of the raw body). */
export function verifyCoinbaseSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}
