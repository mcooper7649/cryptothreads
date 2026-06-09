/**
 * Minimal Printful API v2 client.
 * Base: https://api.printful.com/v2 — Bearer token + optional X-PF-Store-Id.
 * Docs: https://developers.printful.com/docs/v2-beta/
 *
 * We deliberately do NOT use Printful "sync products" (unavailable in v2 and
 * unneeded): our storefront owns the catalog. Printful is used only for mockup
 * generation and order fulfillment.
 */

const BASE = "https://api.printful.com/v2";

export class PrintfulError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "PrintfulError";
  }
}

function authHeaders(): HeadersInit {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) throw new PrintfulError("PRINTFUL_API_TOKEN not set", 0);
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (process.env.PRINTFUL_STORE_ID) {
    h["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
  }
  return h;
}

export async function pf<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });

  const text = await res.text();
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const msg =
      json?.error?.message || json?.result || res.statusText || "request failed";
    throw new PrintfulError(`Printful ${path}: ${msg}`, res.status, json ?? text);
  }

  // v2 wraps payloads in { data, ... } for most endpoints.
  return (json?.data ?? json) as T;
}
