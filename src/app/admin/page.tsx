"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { BLANK_TYPES } from "@/lib/printful/blanks";
import { SLOGANS, STYLES } from "@/lib/design/styles";

interface Product {
  id: string;
  slug: string;
  title: string;
  blankType: string;
  status: string;
  priceCents: number;
  mockupUrls: string[];
  views: number;
  carts: number;
  orders: number;
  retiredReason: string | null;
}
interface Submission {
  id: string;
  lines: string[];
  ticker: string;
  votes: number;
  status: string;
  sloganId: string | null;
}
interface AllowEntry {
  id: string;
  symbol: string | null;
  domain: string | null;
  exactLogoPermitted: boolean;
  notes: string | null;
}
interface TrendEntry {
  id: string;
  lines: string[];
  ticker: string;
  style: string;
  blurb: string;
  source: string;
  previewUrl: string | null;
  hidden: boolean;
  pinned: boolean;
  views: number;
  carts: number;
  orders: number;
  likes: number;
  tweetUrl: string | null;
  expiresAt: string;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [allow, setAllow] = useState<AllowEntry[]>([]);
  const [trends, setTrends] = useState<TrendEntry[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("ct.admin.token") || "";
    setToken(t);
  }, []);

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", "x-admin-token": token }),
    [token]
  );

  const refresh = useCallback(async () => {
    try {
      const [p, a, t, c] = await Promise.all([
        fetch("/api/admin/products", { headers: headers() }),
        fetch("/api/admin/allowlist", { headers: headers() }),
        fetch("/api/admin/trending", { headers: headers() }),
        fetch("/api/admin/community", { headers: headers() }),
      ]);
      if (p.status === 401 || a.status === 401) {
        setAuthed(false);
        setLog("unauthorized — check token");
        return;
      }
      setProducts((await p.json()).products ?? []);
      setAllow((await a.json()).entries ?? []);
      setTrends(t.ok ? (await t.json()).entries ?? [] : []);
      setSubs(c.ok ? (await c.json()).entries ?? [] : []);
      setAuthed(true);
    } catch {
      setLog("network error");
    }
  }, [headers]);

  function saveToken() {
    localStorage.setItem("ct.admin.token", token);
    refresh();
  }

  // --- actions ---
  const [genQuery, setGenQuery] = useState("");
  const [genBlank, setGenBlank] = useState("tee");
  const [genMode, setGenMode] = useState("STYLIZED");
  const [genStyle, setGenStyle] = useState("slogan");
  const [genSlogan, setGenSlogan] = useState("hodl");

  async function generate() {
    setLog("generating…");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ query: genQuery, blankType: genBlank, mode: genMode, style: genStyle, slogan: genSlogan }),
    });
    const data = await res.json();
    setLog(res.ok ? `created ${data.product?.slug} (${data.product?.status})` : `error: ${data.message || data.error}`);
    refresh();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  async function patchTrend(id: string, patch: { hidden?: boolean; pinned?: boolean }) {
    await fetch("/api/admin/trending", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, ...patch }) });
    refresh();
  }

  async function moderate(id: string, action: "hide" | "unhide" | "promote") {
    const res = await fetch("/api/admin/community", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, action }) });
    if (!res.ok) setLog(`community ${action}: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
    refresh();
  }

  const [alSymbol, setAlSymbol] = useState("");
  const [alDomain, setAlDomain] = useState("");
  async function addAllow() {
    await fetch("/api/admin/allowlist", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        symbol: alSymbol || undefined,
        domain: alDomain || undefined,
        exactLogoPermitted: true,
      }),
    });
    setAlSymbol("");
    setAlDomain("");
    refresh();
  }
  async function delAllow(id: string) {
    await fetch(`/api/admin/allowlist?id=${id}`, { method: "DELETE", headers: headers() });
    refresh();
  }

  const fld = "rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 outline-none focus:border-[var(--accent)]";
  const btn = "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold hover:opacity-90";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">Admin</h1>

      <div className="mt-6 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-white/60">Admin token</label>
          <input className={`${fld} w-full`} type="password" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <button className={btn} onClick={saveToken}>Save &amp; load</button>
      </div>
      {log && <div className="mt-3 text-sm text-[var(--accent-2)]">{log}</div>}

      {authed && (
        <>
          {/* Generate */}
          <section className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 font-bold">Generate a drop</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input className={fld} placeholder="ticker or url" value={genQuery} onChange={(e) => setGenQuery(e.target.value)} />
              <select className={fld} value={genBlank} onChange={(e) => setGenBlank(e.target.value)}>
                {BLANK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className={fld} value={genStyle} onChange={(e) => setGenStyle(e.target.value)}>
                {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select className={fld} value={genSlogan} onChange={(e) => setGenSlogan(e.target.value)}>
                {SLOGANS.map((s) => <option key={s.id} value={s.id}>{s.lines.join(" ")}</option>)}
              </select>
              <select className={fld} value={genMode} onChange={(e) => setGenMode(e.target.value)}>
                <option value="STYLIZED">stylized</option>
                <option value="EXACT">exact</option>
              </select>
              <button className={btn} onClick={generate}>Generate</button>
            </div>
          </section>

          {/* Trending: auto-published by the daily collector; hide anything that shouldn't be up */}
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 font-bold">Trending memes ({trends.filter((t) => !t.hidden && new Date(t.expiresAt) > new Date()).length} live)</h2>
            <div className="space-y-2 text-sm">
              {trends.map((t) => {
                const expired = new Date(t.expiresAt) <= new Date();
                return (
                  <div key={t.id} className="flex items-center gap-3 border-b border-[var(--border)] py-2">
                    {t.previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.previewUrl.replace(/^https?:\/\/[^/]+/, "")} alt="" className="h-14 w-12 shrink-0 object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate ${t.hidden ? "line-through text-white/40" : ""}`}>{t.lines.join(" / ")}</div>
                      <div className="truncate text-xs text-white/40">
                        {t.ticker} · {t.style} · {t.source} · {t.hidden ? "hidden" : expired ? (t.pinned ? "expired, pinned in studio" : "expired") : `until ${new Date(t.expiresAt).toLocaleDateString()}`} · {t.blurb}
                      </div>
                      <div className="text-xs text-white/40">
                        {t.views} views · {t.carts} carts · {t.orders} orders · {t.likes} likes
                        {t.tweetUrl && <> · <a href={t.tweetUrl} target="_blank" rel="noreferrer" className="underline">post</a></>}
                      </div>
                    </div>
                    <button
                      onClick={() => patchTrend(t.id, { pinned: !t.pinned })}
                      className={`shrink-0 rounded px-2 py-1 text-xs ${t.pinned ? "bg-[var(--accent)]" : "border border-[var(--border)] hover:border-white/40"}`}
                    >
                      {t.pinned ? "Pinned" : "Pin"}
                    </button>
                    <button
                      onClick={() => patchTrend(t.id, { hidden: !t.hidden })}
                      className={`shrink-0 rounded px-2 py-1 text-xs ${t.hidden ? "border border-[var(--border)] hover:border-white/40" : "bg-red-600"}`}
                    >
                      {t.hidden ? "Unhide" : "Hide"}
                    </button>
                  </div>
                );
              })}
              {!trends.length && <div className="text-white/40">Nothing yet. The collector runs three times a day.</div>}
            </div>
          </section>

          {/* Community board: auto-filtered, printed at 5 votes; hide anything that slipped through */}
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 font-bold">Shill board ({subs.filter((s) => s.status === "LIVE").length} open)</h2>
            <div className="space-y-2 text-sm">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border-b border-[var(--border)] py-2">
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${s.status === "HIDDEN" ? "line-through text-white/40" : ""}`}>{s.lines.join(" / ")}</div>
                    <div className="text-xs text-white/40">{s.ticker} · {s.votes} votes · {s.status.toLowerCase()}</div>
                  </div>
                  {s.status === "LIVE" && (
                    <button onClick={() => moderate(s.id, "promote")} className="shrink-0 rounded border border-[var(--border)] px-2 py-1 text-xs hover:border-white/40">
                      Print now
                    </button>
                  )}
                  <button
                    onClick={() => moderate(s.id, s.status === "HIDDEN" ? "unhide" : "hide")}
                    className={`shrink-0 rounded px-2 py-1 text-xs ${s.status === "HIDDEN" ? "border border-[var(--border)] hover:border-white/40" : "bg-red-600"}`}
                  >
                    {s.status === "HIDDEN" ? "Unhide" : "Hide"}
                  </button>
                </div>
              ))}
              {!subs.length && <div className="text-white/40">No ideas yet.</div>}
            </div>
          </section>

          {/* Allowlist */}
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 font-bold">EXACT-logo allowlist</h2>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input className={fld} placeholder="symbol (UNI)" value={alSymbol} onChange={(e) => setAlSymbol(e.target.value)} />
              <input className={fld} placeholder="domain (uniswap.org)" value={alDomain} onChange={(e) => setAlDomain(e.target.value)} />
              <button className={btn} onClick={addAllow}>Add</button>
            </div>
            <div className="space-y-1 text-sm">
              {allow.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-[var(--border)] py-1">
                  <span>{a.symbol || a.domain} {a.exactLogoPermitted ? "✓ exact ok" : "blocked"}</span>
                  <button className="text-xs text-white/40 hover:text-red-400" onClick={() => delAllow(a.id)}>remove</button>
                </div>
              ))}
              {!allow.length && <div className="text-white/40">No entries — EXACT mode falls back to stylized for everything.</div>}
            </div>
          </section>

          {/* Products */}
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="mb-3 font-bold">Products ({products.length})</h2>
            <div className="space-y-2 text-sm">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-[var(--border)] py-2">
                  <div className="min-w-0">
                    <div className="truncate">{p.title}</div>
                    <div className="text-xs text-white/40">
                      {p.blankType} · {formatPrice(p.priceCents)} · {p.status} · {p.views} views · {p.carts} carts · {p.orders} orders
                      {p.retiredReason && <> · auto-retired: {p.retiredReason}</>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {["ACTIVE", "DRAFT", "DISABLED"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(p.id, s)}
                        className={`rounded px-2 py-1 text-xs ${p.status === s ? "bg-[var(--accent)]" : "border border-[var(--border)] hover:border-white/40"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!products.length && <div className="text-white/40">No products yet.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
