"use client";

import { useState } from "react";
import Link from "next/link";

interface Idea {
  id: string;
  lines: string[];
  ticker: string;
  votes: number;
  promoted: boolean;
  sloganId: string | null;
}

const MAX_LINE = 12;

export function ShillBoard({ initial, promoteAt }: { initial: Idea[]; promoteAt: number }) {
  const [ideas, setIdeas] = useState(initial);
  const [ticker, setTicker] = useState("");
  const [lines, setLines] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const filled = lines.map((l) => l.trim()).filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/shill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim(), lines: filled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't post that.");
      setIdeas((prev) => [{ id: data.id, lines: data.lines, ticker: data.ticker, votes: 1, promoted: false, sloganId: null }, ...prev]);
      setVoted((v) => new Set(v).add(data.id));
      setTicker("");
      setLines(["", "", ""]);
      setMsg({ ok: true, text: "It's on the board. Go get votes." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function upvote(id: string) {
    setVoted((v) => new Set(v).add(id));
    const res = await fetch("/api/shill/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, votes: data.votes, promoted: i.promoted || data.votes >= promoteAt } : i)));
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
      <form onSubmit={submit} className="h-fit space-y-4 border-2 border-[var(--line)] p-5">
        <h2 className="display text-3xl">Your shill</h2>
        <div>
          <label htmlFor="shill-ticker" className="label">Coin ticker</label>
          <input
            id="shill-ticker"
            className="field uppercase"
            value={ticker}
            maxLength={10}
            placeholder="BONK"
            onChange={(e) => setTicker(e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())}
          />
        </div>
        <fieldset>
          <legend className="label">The shirt, line by line</legend>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <input
                key={i}
                aria-label={`Line ${i + 1}`}
                className="field uppercase"
                value={l}
                maxLength={MAX_LINE}
                placeholder={["BOUGHT THE", "TOP", "AGAIN"][i]}
                onChange={(e) => setLines((prev) => prev.map((p, j) => (j === i ? e.target.value.toUpperCase() : p)))}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--dim)]">
            Up to 3 lines, {MAX_LINE} characters each. No real people, brands or politics; we can&apos;t print them.
          </p>
        </fieldset>
        <button type="submit" className="btn-acid w-full" disabled={busy || !ticker || !filled.length}>
          {busy ? "Posting…" : "Shill it"}
        </button>
        {msg && (
          <p role="status" className={msg.ok ? "text-[var(--acid)]" : "text-[var(--red)]"}>
            {msg.text}
          </p>
        )}
      </form>

      <section aria-label="Community ideas">
        {ideas.length ? (
          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ideas.map((i) => (
              <li key={i.id} className="flex flex-col justify-between gap-4 border-2 border-[var(--line)] p-4">
                <div>
                  <p className="display text-3xl leading-[0.95]">
                    {i.lines.map((l, k) => (
                      <span key={k} className="block">{l}</span>
                    ))}
                  </p>
                  <p className="mt-2 text-sm font-bold text-[var(--dim)]">{i.ticker}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--dim)]">
                    <span className="display text-2xl text-[var(--white)]">{i.votes}</span> / {promoteAt} votes
                  </span>
                  {i.promoted ? (
                    <Link
                      href={`/generate?q=${encodeURIComponent(i.ticker)}&style=slogan${i.sloganId ? `&slogan=${encodeURIComponent(i.sloganId)}` : ""}`}
                      className="chip chip-on"
                    >
                      Printed · buy it
                    </Link>
                  ) : (
                    <button type="button" className="chip" disabled={voted.has(i.id)} onClick={() => upvote(i.id)}>
                      {voted.has(i.id) ? "Voted" : "▲ Vote"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-2 border-dashed border-[var(--line)] p-12 text-center text-[var(--dim)]">
            The board is empty. Be the first degen.
          </p>
        )}
      </section>
    </div>
  );
}
