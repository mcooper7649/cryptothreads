import React from "react";
import type { TemplateProps } from "./templates";

/**
 * Streetwear print styles. Every design is light-on-dark on a transparent
 * 4500x5400 canvas (prints go on black garments). Satori subset of CSS:
 * every multi-child div needs display:flex; absolute positioning and
 * transform: rotate() are supported.
 */

export const ACID = "#f5ff00";
export const RED = "#ff2d2d";
export const GREEN = "#22e07a";
const INK = "#0b0b0b";

const W = 4500;
const H = 5400;

/** Deterministic PRNG so a coin always gets the same chart, barcode, etc. */
function rng(seedText: string) {
  let h = 2166136261;
  for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Font size that fits `text` into `width`, given the face's average glyph width (em). */
function fit(text: string, width: number, em: number, max: number) {
  return Math.min(max, Math.floor(width / Math.max(1, text.length * em)));
}

function Logo({ p, size }: { p: TemplateProps; size: number }) {
  if (!p.logoDataUri) return null;
  const ratio = p.logoH && p.logoW ? p.logoH / p.logoW : 1;
  const w = ratio > 1 ? Math.round(size / ratio) : size;
  const h = ratio > 1 ? size : Math.round(size * ratio);
  return <img src={p.logoDataUri} width={w} height={h} />;
}

const frame = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: W,
  height: H,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  ...extra,
});

const tickerText = (p: TemplateProps) => `$${p.ticker.toUpperCase()}`;

/* ---------------------------------------------------------------- box */

export function BoxLogo(p: TemplateProps) {
  const t = tickerText(p);
  const size = fit(t, 3300, 0.5, 1500);
  const sub = p.slogan.join(" ");
  return (
    <div style={frame()}>
      <Logo p={p} size={560} />
      <div
        style={{
          display: "flex",
          marginTop: p.logoDataUri ? 140 : 0,
          backgroundColor: p.accent,
          color: p.onAccent,
          fontFamily: "Anton",
          fontSize: size,
          lineHeight: 1.08,
          padding: "40px 150px 10px",
        }}
      >
        {t}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 150,
          fontFamily: "Archivo Black",
          fontSize: fit(sub, 3600, 0.72, 330),
          letterSpacing: 8,
          color: p.fg,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- slogan */

export function Meme(p: TemplateProps) {
  const lines = p.slogan;
  const longest = Math.max(...lines.map((l) => l.length));
  // One size for every line, so the stack reads as a block.
  const size = fit("X".repeat(longest), 3900, 0.47, lines.length === 1 ? 2400 : 1500);
  const hi = lines.length - 1;
  return (
    <div style={frame()}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            fontFamily: "Anton",
            fontSize: size,
            lineHeight: 1.02,
            color: i === hi && lines.length > 1 ? INK : p.fg,
            backgroundColor: i === hi && lines.length > 1 ? ACID : "transparent",
            padding: i === hi && lines.length > 1 ? "10px 70px 0" : "0",
            marginTop: i === 0 ? 0 : 30,
          }}
        >
          {line}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", marginTop: 220 }}>
        <Logo p={p} size={330} />
        <div
          style={{
            display: "flex",
            marginLeft: p.logoDataUri ? 70 : 0,
            fontFamily: "Archivo Black",
            fontSize: 330,
            color: p.accent,
          }}
        >
          {tickerText(p)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 120,
          fontFamily: "Permanent Marker",
          fontSize: 190,
          color: ACID,
          transform: "rotate(-4deg)",
        }}
      >
        (not financial advice)
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- chart */

export function PumpChart(p: TemplateProps) {
  const rand = rng(p.ticker);
  const n = 16;
  const cw = 3900, ch = 2500, gap = 70;
  const bw = Math.floor((cw - gap * (n - 1)) / n);
  // Random walk with an upward drift, one scary dip, and a moon candle at the end.
  let price = 20;
  const candles = Array.from({ length: n }, (_, i) => {
    const open = price;
    let move = (rand() - 0.32) * 12;
    if (i === Math.floor(n * 0.55)) move = -18;
    if (i === n - 1) move = 34;
    const close = Math.max(4, open + move);
    price = close;
    const hi = Math.max(open, close) + rand() * 5;
    const lo = Math.max(1, Math.min(open, close) - rand() * 5);
    return { open, close, hi, lo };
  });
  const top = Math.max(...candles.map((c) => c.hi)) * 1.04;
  const y = (v: number) => ch - (v / top) * ch;
  const athY = y(Math.max(...candles.slice(0, n - 1).map((c) => c.hi)));
  const sub = p.slogan.join(" ");

  return (
    <div style={frame()}>
      <div style={{ display: "flex", width: cw, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Logo p={p} size={420} />
          <div
            style={{
              display: "flex",
              marginLeft: p.logoDataUri ? 80 : 0,
              fontFamily: "Anton",
              fontSize: fit(tickerText(p), 2400, 0.5, 820),
              color: p.fg,
              lineHeight: 1,
            }}
          >
            {tickerText(p)}
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 420, color: GREEN, lineHeight: 1 }}>
          +∞%
        </div>
      </div>
      <div style={{ display: "flex", position: "relative", width: cw, height: ch, marginTop: 160 }}>
        {/* dashed "ATH" line through the previous high */}
        {Array.from({ length: 26 }, (_, i) => (
          <div
            key={`d${i}`}
            style={{
              position: "absolute",
              left: i * 150,
              top: athY,
              width: 90,
              height: 18,
              backgroundColor: ACID,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: athY - 190,
            display: "flex",
            fontFamily: "IBM Plex Mono",
            fontWeight: 700,
            fontSize: 140,
            color: ACID,
          }}
        >
          OLD ATH
        </div>
        {candles.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? GREEN : RED;
          const x = i * (bw + gap);
          return (
            <div key={i} style={{ display: "flex", position: "absolute", left: 0, top: 0, width: cw, height: ch }}>
              <div
                style={{
                  position: "absolute",
                  left: x + bw / 2 - 12,
                  top: y(c.hi),
                  width: 24,
                  height: Math.max(24, y(c.lo) - y(c.hi)),
                  backgroundColor: color,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y(Math.max(c.open, c.close)),
                  width: bw,
                  height: Math.max(30, Math.abs(y(c.open) - y(c.close))),
                  backgroundColor: color,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", width: cw, height: 24, backgroundColor: p.fg, marginTop: 60 }} />
      <div
        style={{
          display: "flex",
          marginTop: 180,
          fontFamily: "Archivo Black",
          fontSize: fit(sub, 3900, 0.72, 380),
          color: p.fg,
          letterSpacing: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ receipt */

export function Receipt(p: TemplateProps) {
  const rand = rng(`${p.ticker}-receipt`);
  const pw = 2900;
  const rows: [string, string][] = [
    ["PAIR", `${tickerText(p)}/USD`],
    ["SIDE", "BUY"],
    ["SIZE", "TOO MUCH"],
    ["ENTRY", "THE TOP"],
    ["SLIPPAGE", "YES"],
    ["STOP LOSS", "NONE"],
    ["PAPER HANDS", "0"],
  ];
  const mono = { fontFamily: "IBM Plex Mono", color: INK } as const;
  const sep = (k: string) => (
    <div key={k} style={{ display: "flex", ...mono, fontSize: 110, marginTop: 40, marginBottom: 40 }}>
      {"- ".repeat(19)}
    </div>
  );
  const bars = Array.from({ length: 48 }, () => 8 + Math.floor(rand() * 4) * 14);
  const block = 1000000 + Math.floor(rand() * 8999999);
  const teeth = 24;

  return (
    <div style={frame()}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: pw,
          backgroundColor: "#ffffff",
          padding: "170px 190px 120px",
          transform: "rotate(-3deg)",
        }}
      >
        <Logo p={p} size={380} />
        <div style={{ display: "flex", ...mono, fontWeight: 700, fontSize: 190, marginTop: p.logoDataUri ? 70 : 0 }}>
          CRYPTOTHREADS
        </div>
        <div style={{ display: "flex", ...mono, fontSize: 105, marginTop: 20 }}>
          *** TRADE RECEIPT ***
        </div>
        <div style={{ display: "flex", ...mono, fontSize: 105, marginTop: 10 }}>{`BLOCK #${block}`}</div>
        {sep("s1")}
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", width: "100%", justifyContent: "space-between", ...mono, fontSize: 130, marginTop: 14 }}>
            <span>{k}</span>
            <span style={{ fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        {sep("s2")}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", ...mono, fontWeight: 700, fontSize: 200 }}>
          <span>TOTAL</span>
          <span>ALL IN</span>
        </div>
        {sep("s3")}
        {p.slogan.map((l, i) => (
          <div key={i} style={{ display: "flex", ...mono, fontWeight: 700, fontSize: fit(l, 2400, 0.6, 210), lineHeight: 1.15 }}>
            {l}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "flex-end", height: 330, marginTop: 90 }}>
          {bars.map((w, i) => (
            <div key={i} style={{ display: "flex", width: w, height: 330, backgroundColor: i % 2 ? "#ffffff" : INK }} />
          ))}
        </div>
        <div style={{ display: "flex", ...mono, fontSize: 100, marginTop: 50 }}>THANK YOU FOR YOUR LIQUIDITY</div>
      </div>
      {/* torn bottom edge */}
      <div style={{ display: "flex", width: pw, transform: "rotate(-3deg)", marginTop: -8 }}>
        {Array.from({ length: teeth }, (_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: 0,
              height: 0,
              borderLeft: `${pw / teeth / 2}px solid transparent`,
              borderRight: `${pw / teeth / 2}px solid transparent`,
              borderTop: "70px solid #ffffff",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- stamp */

export function Stamp(p: TemplateProps) {
  const d = 3700, r = 1560, cx = W / 2, cy = H / 2;
  // Whole phrases only: repeat the rim text a whole number of times and space
  // the glyphs evenly, so nothing is cut mid-word. ~50 glyphs fit the rim.
  const full = `${p.slogan.join(" ")} ★ ${tickerText(p)} CLUB ★ `;
  const ring = full.length <= 56 ? full : `${p.slogan.join(" ")} ★ `;
  const reps = Math.max(1, Math.round(50 / ring.length));
  const text = ring.repeat(reps);
  const slots = text.length;
  const glyph = Math.min(230, Math.floor(((2 * Math.PI * r) / slots) * 1.05));
  return (
    <div style={{ ...frame(), position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: cx - d / 2,
          top: cy - d / 2,
          width: d,
          height: d,
          borderRadius: d,
          border: `70px solid ${p.fg}`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx - 1300,
          top: cy - 1300,
          width: 2600,
          height: 2600,
          borderRadius: 2600,
          border: `26px solid ${p.accent}`,
          display: "flex",
        }}
      />
      {text.split("").map((ch, i) => {
        const a = (i / slots) * 2 * Math.PI;
        const x = cx + r * Math.sin(a);
        const y = cy - r * Math.cos(a);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 130,
              top: y - 150,
              width: 260,
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Archivo Black",
              fontSize: glyph,
              color: p.fg,
              transform: `rotate(${(a * 180) / Math.PI}deg)`,
            }}
          >
            {ch}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: cx - 1250,
          top: cy - 1250,
          width: 2500,
          height: 2500,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Logo p={p} size={760} />
        <div
          style={{
            display: "flex",
            fontFamily: "Anton",
            fontSize: fit(tickerText(p), 2000, 0.5, 620),
            color: p.fg,
            marginTop: p.logoDataUri ? 60 : 0,
            lineHeight: 1.05,
          }}
        >
          {tickerText(p)}
        </div>
        <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontWeight: 700, fontSize: 150, color: p.accent, letterSpacing: 24 }}>
          MEMBERS ONLY
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- pixel */

const ROCKET = [
  ".......WW.......",
  "......WWWW......",
  ".....WWWWWW.....",
  ".....WWWWWW.....",
  "....WWWWWWWW....",
  "....WWAAAAWW....",
  "....WWAAAAWW....",
  "....WWAAAAWW....",
  "....WWWWWWWW....",
  "....WWWWWWWW....",
  "....WWWWWWWW....",
  "...RWWWWWWWWR...",
  "..RRWWWWWWWWRR..",
  ".RRRWWWWWWWWRRR.",
  ".RRR.WWWWWW.RRR.",
  ".RR...YOOY...RR.",
  "......YOOY......",
  ".......YY.......",
  "......Y..Y......",
  ".......YY.......",
];

/** The rocket as one crisp-edged SVG: separate divs leave anti-aliased seams when scaled. */
function rocketSvg(colors: Record<string, string>): string {
  const rects = ROCKET.flatMap((row, y) =>
    row.split("").flatMap((c, x) =>
      colors[c] ? [`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${colors[c]}"/>`] : []
    )
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ROCKET[0].length} ${ROCKET.length}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function PixelArt(p: TemplateProps) {
  const px = 105;
  const colors: Record<string, string> = { W: p.fg, R: RED, A: p.accent, Y: ACID, O: "#ff9a1f" };
  const lines = p.slogan;
  const longest = Math.max(...lines.map((l) => l.length));
  const size = fit("X".repeat(longest), 3900, 1.0, 560);
  return (
    <div style={frame()}>
      <img src={rocketSvg(colors)} width={ROCKET[0].length * px} height={ROCKET.length * px} />
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            fontFamily: "Press Start 2P",
            fontSize: size,
            color: p.fg,
            marginTop: i === 0 ? 200 : 60,
            lineHeight: 1.1,
          }}
        >
          {l}
        </div>
      ))}
      <div style={{ display: "flex", fontFamily: "Press Start 2P", fontSize: fit(tickerText(p), 3000, 1.0, 330), color: ACID, marginTop: 160 }}>
        {tickerText(p)}
      </div>
      <div style={{ display: "flex", fontFamily: "Press Start 2P", fontSize: 120, color: p.fg, marginTop: 120 }}>
        PRESS START TO HODL
      </div>
    </div>
  );
}
