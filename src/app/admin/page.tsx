"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

interface Product {
  id: string;
  slug: string;
  title: string;
  blankType: string;
  status: string;
  priceCents: number;
  mockupUrls: string[];
}
interface AllowEntry {
  id: string;
  symbol: string | null;
  domain: string | null;
  exactLogoPermitted: boolean;
  notes: string | null;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [allow, setAllow] = useState<AllowEntry[]>([]);
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
      const [p, a] = await Promise.all([
        fetch("/api/admin/products", { headers: headers() }),
        fetch("/api/admin/allowlist", { headers: headers() }),
      ]);
      if (p.status === 401 || a.status === 401) {
        setAuthed(false);
        setLog("unauthorized — check token");
        return;
      }
      setProducts((await p.json()).products ?? []);
      setAllow((await a.json()).entries ?? []);
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

  async function generate() {
    setLog("generating…");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ query: genQuery, blankType: genBlank, mode: genMode }),
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
                <option value="tee">tee</option>
                <option value="hoodie">hoodie</option>
              </select>
              <select className={fld} value={genMode} onChange={(e) => setGenMode(e.target.value)}>
                <option value="STYLIZED">stylized</option>
                <option value="EXACT">exact</option>
              </select>
              <button className={btn} onClick={generate}>Generate</button>
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
                    <div className="text-xs text-white/40">{p.blankType} · {formatPrice(p.priceCents)} · {p.status}</div>
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
