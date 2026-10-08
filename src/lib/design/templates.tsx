import React from "react";
import type { StyleId } from "./styles";
import { BoxLogo, Meme, PixelArt, PumpChart, Receipt, Stamp } from "./templates-street";

export interface TemplateProps {
  ticker: string; // e.g. "BTC"
  name?: string; // e.g. "Bitcoin"
  tagline?: string;
  logoDataUri?: string; // data:image/png;base64,...
  logoW: number;
  logoH: number;
  accent: string;
  /** Text color that reads on a solid accent fill. */
  onAccent: string;
  fg: string;
  /** Slogan lines for styles that print one. */
  slogan: string[];
}

export type TemplateName = StyleId | "exact";

// Fit the ticker to the canvas width: shorter tickers render larger.
function tickerFontSize(ticker: string): number {
  const len = Math.max(ticker.length, 1);
  if (len <= 3) return 880;
  if (len === 4) return 700;
  if (len === 5) return 560;
  return Math.floor(3200 / len);
}

function logoBox(p: TemplateProps, maxW: number) {
  const ratio = p.logoH && p.logoW ? p.logoH / p.logoW : 1;
  const width = maxW;
  const height = Math.round(maxW * ratio);
  return { width, height };
}

/**
 * STYLIZED (default, lower IP risk): ticker typography is the hero, logo is a
 * small accent badge above it. Reads great at print resolution since the type
 * is vector and the logo is small.
 */
function Stylized(p: TemplateProps): React.ReactElement {
  const fontSize = tickerFontSize(p.ticker);
  const { width, height } = logoBox(p, 760);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Roboto",
      }}
    >
      {p.logoDataUri ? (
        <img src={p.logoDataUri} width={width} height={height} style={{ marginBottom: 80 }} />
      ) : null}
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo Black",
          fontSize,
          lineHeight: 1,
          color: p.fg,
          letterSpacing: -8,
        }}
      >
        <span style={{ color: p.accent }}>$</span>
        <span>{p.ticker.toUpperCase()}</span>
      </div>
      <div
        style={{
          display: "flex",
          height: 28,
          width: Math.min(1400, fontSize),
          backgroundColor: p.accent,
          marginTop: 40,
          marginBottom: 56,
          borderRadius: 14,
        }}
      />
      {p.name ? (
        <div
          style={{
            display: "flex",
            fontFamily: "Roboto",
            fontWeight: 700,
            fontSize: 150,
            letterSpacing: 30,
            textTransform: "uppercase",
            color: p.fg,
          }}
        >
          {p.name}
        </div>
      ) : null}
      {p.tagline ? (
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontFamily: "Roboto",
            fontSize: 92,
            color: p.fg,
            opacity: 0.85,
          }}
        >
          {p.tagline}
        </div>
      ) : null}
    </div>
  );
}

/**
 * EXACT (allowlist only): faithful logo reproduction as the hero, with the
 * project name beneath. Used only for tokens cleared in the Allowlist.
 */
function Exact(p: TemplateProps): React.ReactElement {
  const { width, height } = logoBox(p, 2600);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Roboto",
      }}
    >
      {p.logoDataUri ? (
        <img src={p.logoDataUri} width={width} height={height} style={{ marginBottom: 120 }} />
      ) : null}
      {p.name ? (
        <div
          style={{
            display: "flex",
            fontFamily: "Archivo Black",
            fontSize: 280,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: p.fg,
          }}
        >
          {p.name}
        </div>
      ) : null}
    </div>
  );
}

export const TEMPLATES: Record<TemplateName, (p: TemplateProps) => React.ReactElement> = {
  ticker: Stylized,
  box: BoxLogo,
  slogan: Meme,
  chart: PumpChart,
  receipt: Receipt,
  stamp: Stamp,
  pixel: PixelArt,
  exact: Exact,
};
