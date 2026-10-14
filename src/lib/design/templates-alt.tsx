import React from "react";
import type { TemplateProps } from "./templates";

/**
 * Alternate print styles with their own looks, deliberately unlike the site's
 * acid-on-black branding: gothic, warning label, newspaper, vaporwave,
 * terminal, tarot. Same 4500x5400 transparent canvas and Satori rules as
 * templates-street.tsx (multi-child divs need display:flex).
 */

const W = 4500;
const H = 5400;

const frame = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: W,
  height: H,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  ...extra,
});

/** Font size that fits the longest line into `width`, given the face's average glyph width (em). */
function fitLines(lines: string[], width: number, em: number, max: number) {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return Math.min(max, Math.floor(width / (longest * em)));
}

function Logo({ p, size, style }: { p: TemplateProps; size: number; style?: React.CSSProperties }) {
  if (!p.logoDataUri) return null;
  const ratio = p.logoH && p.logoW ? p.logoH / p.logoW : 1;
  const w = ratio > 1 ? Math.round(size / ratio) : size;
  const h = ratio > 1 ? size : Math.round(size * ratio);
  return <img src={p.logoDataUri} width={w} height={h} style={style} />;
}

const Lines = ({ lines, style }: { lines: string[]; style: React.CSSProperties }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
    {lines.map((l, i) => (
      <div key={i} style={{ display: "flex", justifyContent: "center", width: "100%", textAlign: "center", ...style }}>
        {l}
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------- gothic */

/** Blackletter streetwear: the slogan in gothic type, ticker small and spaced underneath. */
export function Gothic(p: TemplateProps) {
  const lines = p.slogan.map((l) => l.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()));
  const size = fitLines(lines, 4100, 0.5, 1100);
  return (
    <div style={frame()}>
      <Lines lines={lines} style={{ fontFamily: "Pirata One", fontSize: size, lineHeight: 0.95, color: "#f2f2f2" }} />
      <div style={{ display: "flex", width: 2600, height: 14, backgroundColor: "#f2f2f2", marginTop: 160 }} />
      <div style={{ display: "flex", alignItems: "center", marginTop: 110 }}>
        <Logo p={p} size={230} style={{ marginRight: 60 }} />
        <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontWeight: 700, fontSize: 200, letterSpacing: 60, color: "#f2f2f2" }}>
          {p.ticker.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ warning */

const HAZARD =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470 410"><path d="M235 10 L460 400 L10 400 Z" fill="#111111"/><path d="M235 120 L235 270" stroke="#ffd400" stroke-width="48" stroke-linecap="round"/><circle cx="235" cy="335" r="28" fill="#ffd400"/></svg>'
  ).toString("base64");

/** Hazard label: yellow panel, black border, a warning about your portfolio. */
export function Warning(p: TemplateProps) {
  const Y = "#ffd400";
  const K = "#111111";
  const size = fitLines(p.slogan, 3100, 0.74, 620);
  const stripes = Array.from({ length: 13 });
  const band = (key: string) => (
    <div key={key} style={{ display: "flex", width: 3600, height: 260, overflow: "hidden", backgroundColor: K }}>
      {stripes.map((_, i) => (
        <div key={i} style={{ display: "flex", width: 150, height: 600, marginLeft: 125, marginTop: -170, backgroundColor: Y, transform: "rotate(35deg)" }} />
      ))}
    </div>
  );
  return (
    <div style={frame()}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 3600, backgroundColor: Y, border: `60px solid ${K}` }}>
        {band("top")}
        <div style={{ display: "flex", alignItems: "center", marginTop: 170 }}>
          <img src={HAZARD} width={470} height={410} style={{ marginRight: 90 }} />
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 560, color: K, letterSpacing: 10 }}>WARNING</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 90, marginBottom: 60 }}>
          <Lines lines={p.slogan} style={{ fontFamily: "Archivo Black", fontSize: size, lineHeight: 1.05, color: K }} />
        </div>
        <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontWeight: 700, fontSize: 130, color: K, marginBottom: 150 }}>
          {`CONTENTS: ${p.ticker.toUpperCase()}. EXTREMELY VOLATILE.`}
        </div>
        {band("bottom")}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- headline */

/** Newspaper front page: masthead, rules, the slogan as the headline, fake columns. */
export function Headline(p: TemplateProps) {
  const PAPER = "#f1ece0";
  const K = "#151515";
  const size = fitLines(p.slogan, 3300, 0.62, 700);
  const col = (n: number, seed: number) =>
    Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ display: "flex", height: 34, marginTop: 46, backgroundColor: "#8f8a80", width: `${70 + ((i * 37 + seed) % 30)}%` }} />
    ));
  return (
    <div style={frame()}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 3800, backgroundColor: PAPER, padding: "150px 200px 200px" }}>
        <div style={{ display: "flex", fontFamily: "Pirata One", fontSize: 420, color: K }}>The Degen Times</div>
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", borderTop: `14px solid ${K}`, borderBottom: `6px solid ${K}`, padding: "30px 0", marginTop: 40, fontFamily: "IBM Plex Mono", fontWeight: 700, fontSize: 100, color: K }}>
          <span>LATE EDITION</span>
          <span>{`${p.ticker.toUpperCase()} EDITION`}</span>
          <span>PRICE: YOUR BAGS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 130 }}>
          <Lines lines={p.slogan} style={{ fontFamily: "Abril Fatface", fontSize: size, lineHeight: 1.0, color: K }} />
        </div>
        <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontSize: 110, color: K, marginTop: 90 }}>
          Sources confirm. Analysts &quot;not surprised.&quot;
        </div>
        <div style={{ display: "flex", width: "100%", marginTop: 110, borderTop: `6px solid ${K}` }}>
          {[0, 1, 2].map((c) => (
            <div key={c} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 50px" }}>
              {col(9, c * 11)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- vapor */

/** Vaporwave: striped gradient sun over a magenta grid, slogan in neon with a cyan echo. */
export function Vapor(p: TemplateProps) {
  const PINK = "#ff4fd8";
  const CYAN = "#3ef4ff";
  const size = fitLines(p.slogan, 3900, 0.8, 640); // Monoton is wide
  const sun = 2500;
  return (
    <div style={frame({ justifyContent: "flex-start", paddingTop: 260 })}>
      <div style={{ display: "flex", flexDirection: "column", width: sun, height: sun / 2, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", width: sun, height: sun, borderRadius: sun, backgroundImage: "linear-gradient(180deg, #ffe45e 0%, #ff8a3d 35%, #ff3d9a 60%)" }}>
          {[0.32, 0.38, 0.43, 0.47].map((y, i) => (
            <div key={i} style={{ display: "flex", position: "absolute", top: sun * y, left: 0, width: sun, height: 40 + i * 22, backgroundColor: "#000000" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 4100, height: 900, marginTop: 0, borderTop: `22px solid ${PINK}` }}>
        {[90, 200, 340, 520, 760].map((y, i) => (
          <div key={i} style={{ display: "flex", position: "absolute", top: y, left: 0, width: 4100, height: 14, backgroundColor: PINK }} />
        ))}
        {[-1600, -900, -300, 300, 900, 1600].map((x, i) => (
          <div key={`v${i}`} style={{ display: "flex", position: "absolute", top: 0, left: 2050 + x, width: 14, height: 900, backgroundColor: PINK, transform: `rotate(${(x / 1600) * -40}deg)`, transformOrigin: "top center" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 160 }}>
        <Lines lines={p.slogan} style={{ fontFamily: "Monoton", fontSize: size, lineHeight: 1.15, color: "#ffffff", textShadow: `24px 24px 0 ${CYAN}, -10px -10px 0 ${PINK}` }} />
      </div>
      <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontWeight: 700, fontSize: 170, letterSpacing: 50, color: CYAN, marginTop: 120 }}>
        {`${p.ticker.toUpperCase()} 1999`}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- terminal */

/** Green CRT terminal: a few commands, the slogan as the output, a block cursor. */
export function Terminal(p: TemplateProps) {
  const G = "#39ff6a";
  const DIM = "#1f9c45";
  const t = p.ticker.toUpperCase();
  const size = fitLines(p.slogan, 3500, 0.5, 560);
  const line = (text: string, color = G, fs = 190) => (
    <div style={{ display: "flex", fontFamily: "VT323", fontSize: fs, color, lineHeight: 1.1 }}>{text}</div>
  );
  return (
    <div style={frame()}>
      <div style={{ display: "flex", flexDirection: "column", width: 3900, border: `30px solid ${G}`, borderRadius: 120, padding: "120px 200px 220px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 90 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", width: 110, height: 110, borderRadius: 110, border: `14px solid ${G}`, marginRight: 50 }} />
          ))}
          <div style={{ display: "flex", fontFamily: "VT323", fontSize: 150, color: DIM, marginLeft: 40 }}>{`degen@${t.toLowerCase()}:~`}</div>
        </div>
        {line(`$ check-pnl --coin ${t}`)}
        {line("> unrealized: -94.20%", DIM)}
        {line("$ cat thesis.txt")}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
          {p.slogan.map((l, i) => (
            <div key={i} style={{ display: "flex", fontFamily: "VT323", fontSize: size, color: G, lineHeight: 0.95 }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 80 }}>
          {line("$", G, 230)}
          <div style={{ display: "flex", width: 120, height: 200, backgroundColor: G, marginLeft: 50 }} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- tarot */

/** Tarot card: gold double border, numeral, the coin as the card's sigil, slogan as its name. */
export function Tarot(p: TemplateProps) {
  const GOLD = "#d9b45a";
  const cw = 3000;
  const ch = 4900;
  const n = (p.ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 21) + 1;
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"][n - 1];
  const size = fitLines(p.slogan, 2400, 0.74, 330); // Cinzel Decorative caps are wide
  return (
    <div style={frame()}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cw, height: ch, border: `40px solid ${GOLD}`, borderRadius: 80, padding: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: "100%", height: "100%", border: `14px solid ${GOLD}`, borderRadius: 40, padding: "140px 120px" }}>
          <div style={{ display: "flex", fontFamily: "Cinzel Decorative", fontSize: 300, color: GOLD }}>{roman}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 1700, height: 1700, borderRadius: 1700, border: `18px solid ${GOLD}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 1350, height: 1350, borderRadius: 1350, border: `8px solid ${GOLD}` }}>
              {p.logoDataUri ? (
                <Logo p={p} size={760} />
              ) : (
                <div style={{ display: "flex", fontFamily: "Cinzel Decorative", fontSize: 360, color: GOLD }}>{p.ticker.toUpperCase()}</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Lines lines={p.slogan} style={{ fontFamily: "Cinzel Decorative", fontSize: size, lineHeight: 1.15, color: GOLD }} />
            <div style={{ display: "flex", fontFamily: "Cinzel Decorative", fontSize: 150, color: GOLD, marginTop: 70, letterSpacing: 20 }}>
              {`THE ${p.ticker.toUpperCase()}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- nouns */

/**
 * A real Noun (CC0, onchain pixel art) as the hero, slogan underneath in the
 * Nouns community's chunky type. Falls back to the slogan alone if the art is missing.
 */
export function Nouns(p: TemplateProps) {
  const size = fitLines(p.slogan, 3900, 0.5, 820);
  const art = 2700;
  return (
    <div style={frame()}>
      {p.art && <img src={p.art} width={art} height={art} style={{ borderRadius: 90 }} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 150 }}>
        <Lines lines={p.slogan} style={{ fontFamily: "Londrina Solid", fontSize: size, lineHeight: 0.95, color: "#ffffff" }} />
      </div>
      <div style={{ display: "flex", fontFamily: "Londrina Solid", fontSize: 170, letterSpacing: 12, color: "#d5d7e1", marginTop: 90 }}>
        {`${p.artLabel ?? "NOUNS"} · ${p.ticker.toUpperCase()} · CC0`}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- art */

/** Laser eye: a hot core, a red glow, and a beam shooting out to the side. */
function LaserEye({ x, y, scale, dir }: { x: number; y: number; scale: number; dir: number }) {
  const core = Math.round(26 * scale);
  const glow = Math.round(150 * scale);
  const beamL = Math.round(1400 * scale);
  const beamH = Math.round(38 * scale);
  const rad = (dir * Math.PI) / 180;
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}>
      {/* Satori rotates about the center, so place the beam's center half a beam-length out from the eye. */}
      <div style={{ display: "flex", position: "absolute", left: x + (Math.cos(rad) * beamL) / 2 - beamL / 2, top: y + (Math.sin(rad) * beamL) / 2 - beamH / 2, width: beamL, height: beamH, backgroundImage: "linear-gradient(90deg, rgba(255,40,40,0.95), rgba(255,40,40,0))", transform: `rotate(${dir}deg)` }} />
      <div style={{ display: "flex", position: "absolute", left: x - glow / 2, top: y - glow / 2, width: glow, height: glow, borderRadius: glow, backgroundImage: "radial-gradient(circle, rgba(255,60,60,0.95) 0%, rgba(255,0,0,0.55) 35%, rgba(255,0,0,0) 70%)" }} />
      <div style={{ display: "flex", position: "absolute", left: x - core / 2, top: y - core / 2, width: core, height: core, borderRadius: core, backgroundColor: "#fff6e0" }} />
    </div>
  );
}

/**
 * A public-domain painting with a crypto spin: laser eyes where there's a face,
 * the slogan underneath, and a small credit line.
 */
export function Art(p: TemplateProps) {
  const maxW = 3900;
  const aw = p.artW ?? 1;
  const ah = p.artH ?? 1;
  // Vertical budget: margins + gaps + credit line take ~650; the slogan gets what it
  // needs and the painting shrinks to fit (portraits would otherwise push line 3 off).
  const n = Math.max(1, p.slogan.length);
  const minArt = 2300;
  let size = fitLines(p.slogan, 4100, 0.47, 700);
  size = Math.min(size, Math.floor((H - 650 - minArt) / (n * 1.02)));
  const maxH = Math.min(3500, H - 650 - Math.ceil(n * size * 1.02));
  const k = Math.min(maxW / aw, maxH / ah);
  const w = Math.round(aw * k);
  const h = Math.round(ah * k);
  const eyes = p.eyes ?? [];
  // Beams fan out away from the face's center.
  const cx = eyes.reduce((a, e) => a + e[0], 0) / Math.max(1, eyes.length);
  return (
    <div style={frame()}>
      {p.art && (
        <div style={{ display: "flex", position: "relative", width: w, height: h, overflow: "hidden" }}>
          <img src={p.art} width={w} height={h} />
          {eyes.map(([ex, ey], i) => (
            <LaserEye key={i} x={ex * w} y={ey * h} scale={w / 3000} dir={eyes.length > 1 ? (ex < cx ? 195 : -15) : 190} />
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 140 }}>
        <Lines lines={p.slogan} style={{ fontFamily: "Anton", fontSize: size, lineHeight: 1.02, color: "#ffffff" }} />
      </div>
      <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontSize: 105, color: "#9a9a9a", marginTop: 70 }}>
        {`${p.artLabel ?? ""} · ${p.ticker.toUpperCase()} edition`}
      </div>
    </div>
  );
}
