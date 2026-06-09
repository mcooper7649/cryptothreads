import { prisma } from "@/lib/db";
import { NormalizedQuery, ResolvedLogo, SourceResult } from "./types";
import { putAsset } from "@/lib/storage";
import type { LogoCache } from "@prisma/client";

function toResolved(row: LogoCache, cached: boolean): ResolvedLogo {
  return {
    id: row.id,
    source: row.source,
    isVector: row.isVector,
    assetUrl: row.assetUrl,
    assetKey: row.assetKey,
    contentType: row.contentType,
    symbol: row.symbol,
    domain: row.domain,
    coingeckoId: row.coingeckoId,
    name: row.name,
    palette: (row.palette as string[] | null) ?? null,
    cached,
  };
}

function isFresh(row: LogoCache): boolean {
  const ageMs = Date.now() - row.fetchedAt.getTime();
  return ageMs < row.ttlSeconds * 1000;
}

/** Look up by any known identity key. Returns null on miss/stale. */
export async function lookupCache(
  q: NormalizedQuery
): Promise<ResolvedLogo | null> {
  const ors: Record<string, string>[] = [];
  if (q.symbol) ors.push({ symbol: q.symbol });
  if (q.domain) ors.push({ domain: q.domain });
  if (q.coingeckoId) ors.push({ coingeckoId: q.coingeckoId });
  if (!ors.length) return null;

  const row = await prisma.logoCache.findFirst({ where: { OR: ors } });
  if (!row) return null;
  if (!isFresh(row)) return null;
  return toResolved(row, true);
}

/** Store the asset bytes + upsert the cache row. */
export async function writeCache(
  q: NormalizedQuery,
  result: SourceResult
): Promise<ResolvedLogo> {
  const ext = result.isVector
    ? "svg"
    : (result.contentType.split("/")[1] || "png").replace("+xml", "");
  const symbol = result.symbol || q.symbol || null;
  const domain = result.domain || q.domain || null;
  const coingeckoId = result.coingeckoId || q.coingeckoId || null;
  const keyBase = (symbol || domain || coingeckoId || q.raw).toLowerCase();
  const key = `logos/${keyBase.replace(/[^a-z0-9._-]/g, "_")}.${ext}`;

  const stored = await putAsset(key, result.data, result.contentType);

  const data = {
    symbol,
    domain,
    coingeckoId,
    name: result.name ?? null,
    source: result.source,
    isVector: result.isVector,
    assetUrl: stored.url,
    assetKey: stored.key,
    contentType: result.contentType,
    palette: result.palette ?? undefined,
    fetchedAt: new Date(),
  };

  // Upsert on the most specific available unique key.
  const where = symbol
    ? { symbol }
    : domain
      ? { domain }
      : { coingeckoId: coingeckoId! };

  const row = await prisma.logoCache.upsert({
    where: where as any,
    update: data,
    create: data,
  });
  return toResolved(row, false);
}
