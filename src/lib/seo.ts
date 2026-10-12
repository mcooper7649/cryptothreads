import { siteUrl } from "@/lib/store-config";

/** Absolute URL on the current site (SITE_URL), for canonicals, sitemaps and JSON-LD. */
export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

/**
 * Stored asset URLs carry whatever host SITE_URL was when they were made; for
 * share cards and structured data, point them at the current site instead.
 */
export const onSite = (url: string | null | undefined) => (url ? abs(url.replace(/^https?:\/\/[^/]+/, "")) : undefined);

export const SITE_NAME = "CryptoThreads";

/** Product structured data needs plain dollars, not cents. */
export const dollars = (cents: number) => (cents / 100).toFixed(2);
