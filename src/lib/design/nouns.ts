import { putAsset, readAsset, localPath } from "@/lib/storage";
import { existsSync } from "fs";

/**
 * Nouns art for the "nouns" print style. Nouns are CC0 (public domain) and
 * generated onchain; noun.pics serves each one's SVG. Fetched once per id and
 * kept in storage, so a design always prints the same Noun.
 */

const MAX_ID = 1400; // every id below this exists

export function nounIdFor(seed: string): number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % MAX_ID;
}

export async function nounArt(seed: string): Promise<{ id: number; dataUri: string } | null> {
  const id = nounIdFor(seed);
  const key = `nouns/${id}.svg`;
  let svg: string | null = null;
  const file = localPath(key);
  if (file && existsSync(file)) {
    svg = (await readAsset("", key).catch(() => null))?.toString("utf8") ?? null;
  }
  if (!svg) {
    const res = await fetch(`https://noun.pics/${id}.svg`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!res?.ok) return null;
    svg = await res.text();
    // Only plain pixel SVGs: no scripts, links or embedded content.
    if (!svg.startsWith("<svg") || svg.length > 200_000 || /<script|<foreignObject|href=/i.test(svg)) return null;
    await putAsset(key, Buffer.from(svg), "image/svg+xml").catch(() => undefined);
  }
  return { id, dataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` };
}
