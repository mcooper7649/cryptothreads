import { NormalizedQuery, SourceResult } from "../types";

/**
 * Brandfetch Logo API (free <=500k req/mo, no badge).
 * CDN pattern: https://cdn.brandfetch.io/{identifier}/{logo-type}.{format}?c={CLIENT_ID}
 * Identifier may be a domain ("nike.com") or crypto symbol via the
 * "crypto/{SYMBOL}" path. SVG is available for the "logo" and "symbol" types.
 * Docs: https://docs.brandfetch.com/logo-api/overview
 */

const CLIENT_ID = process.env.BRANDFETCH_CLIENT_ID;

function buildUrls(q: NormalizedQuery): string[] {
  if (!CLIENT_ID) return [];
  const c = encodeURIComponent(CLIENT_ID);
  const urls: string[] = [];

  // Prefer SVG (vector -> infinite print scale). "logo" then "symbol".
  if (q.domain) {
    urls.push(`https://cdn.brandfetch.io/${q.domain}/logo.svg?c=${c}`);
    urls.push(`https://cdn.brandfetch.io/${q.domain}/symbol.svg?c=${c}`);
    urls.push(`https://cdn.brandfetch.io/${q.domain}/w/512/h/512/logo.png?c=${c}`);
  }
  if (q.symbol) {
    urls.push(`https://cdn.brandfetch.io/crypto/${q.symbol}/logo.svg?c=${c}`);
    urls.push(`https://cdn.brandfetch.io/crypto/${q.symbol}/symbol.svg?c=${c}`);
    urls.push(`https://cdn.brandfetch.io/crypto/${q.symbol}/w/512/h/512/logo.png?c=${c}`);
  }
  return urls;
}

export async function fromBrandfetch(
  q: NormalizedQuery
): Promise<SourceResult | null> {
  const urls = buildUrls(q);
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      // Brandfetch returns a fallback/placeholder for unknown brands; guard on it.
      if (!/image\//.test(contentType)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 256) continue; // too small to be a real logo
      const isVector = /svg/.test(contentType);
      return {
        source: "brandfetch",
        data: buf,
        contentType: isVector ? "image/svg+xml" : contentType,
        isVector,
        symbol: q.symbol,
        domain: q.domain,
      };
    } catch {
      continue;
    }
  }
  return null;
}
