# CryptoThreads

Crypto streetwear, printed on demand. Any coin, any meme.

**Live:** https://cryptothreads.mycodedojo.com

Type a ticker (`BTC`), a CoinGecko id (`ethereum`) or a project's website (`uniswap.org`). CryptoThreads finds the logo, composes a print-ready design in the browser preview, and when someone orders, renders a 4500×5400 print file that Printful prints and ships. There's no inventory: every product is made after it's paid for.

## How it works

```
query ──► logo waterfall ──► render pipeline ──► storage ──► Printful ──► shipped
          Brandfetch (SVG)    satori: JSX → SVG    Blob or        files, mockups,
          cryptoicons (SVG)   resvg: SVG → PNG     local volume   orders
          CoinGecko (PNG)     sharp: palette,
          + DB cache          preview resize
```

- **Logo waterfall** ([`src/lib/logo`](src/lib/logo)). Vector sources come first, then raster. The first hit is stored and cached in Postgres, so each logo is fetched once. Each query is classified as a ticker, a domain or a CoinGecko id before lookup, so `btc` and `BTC` share one cache entry.
- **Render pipeline** ([`src/lib/design`](src/lib/design)). Designs are React components rendered to SVG with satori, then rasterized by resvg at 300 DPI on a transparent background. The accent color is pulled from the logo's dominant colors with sharp. The live preview rasterizes the same SVG at 900px, about 25× cheaper, with a per-IP rate limit and a small cache.
- **Seven print styles + a meme library** ([`styles.ts`](src/lib/design/styles.ts), [`templates-street.tsx`](src/lib/design/templates-street.tsx)): ticker, box logo, stacked meme slogan, pump chart (seeded candlesticks per coin), trade receipt, club stamp (text set around a circle glyph by glyph), and 8-bit (pixel rocket as a crisp-edged SVG). Slogans include coin in-jokes offered only for their coin. `npx tsx scripts/style-gallery.mts` renders every style for a few coins onto one contact sheet.
- **Six blanks** ([`blanks.ts`](src/lib/printful/blanks.ts)): classic tee, oversized boxy tee, long sleeve, crewneck, hoodie (all black, DTG front print) and kiss-cut stickers, whose art is trimmed and set on a black rounded backing because stickers are white vinyl.
- **Two design modes.** **Stylized** (the default) makes the ticker the hero, with the logo as a small badge. **Exact logo** prints the logo itself, and only for projects on an admin allowlist. Others quietly fall back to stylized, which keeps trademark risk low. Every product has a kill switch, and the [IP & takedown policy](src/app/policy/ip/page.tsx) is linked in the footer.
- **Payments → fulfillment** ([`src/lib/fulfillment.ts`](src/lib/fulfillment.ts)). Checkout recomputes prices on the server and opens a Stripe Checkout session, which takes cards and wallets plus stablecoins (USDC, USDP, USDG on Ethereum, Base, Polygon and Solana) through Stripe's crypto payment method. The signed webhook marks the order paid only once the session is paid. It then re-renders the exact print file, maps blank + size to a Printful catalog variant (always a dark garment, since designs are light-on-dark), and creates a Printful order. Orders stay drafts unless `PRINTFUL_AUTO_CONFIRM=1`. Fulfillment is idempotent.
- **Daily drops** ([`scripts/daily-routine.md`](scripts/daily-routine.md)). A scheduled Claude agent picks trending coins from CoinGecko, generates products through the admin API and writes a short post about them. [`scripts/daily-drop.mts`](scripts/daily-drop.mts) is the deterministic fallback.

## Stack

Next.js 14 (App Router, TypeScript, Tailwind) · Prisma + PostgreSQL · satori, @resvg/resvg-js, sharp · Printful API v2 · Stripe Checkout (cards + stablecoins) · Zod · Docker

## Running it

### Self-hosted (how the live store runs)

```bash
cp .env.example .env    # set POSTGRES_PASSWORD, ADMIN_TOKEN, SITE_URL, and the keys below
docker compose up -d --build
```

Compose runs the app and Postgres 16. The schema is applied on start, and generated assets live in a volume served at `/cache/…`. Put it behind a reverse proxy with HTTPS: Printful downloads print files from `SITE_URL`, so that has to be a public https origin.

### Local development

```bash
npm install
cp .env.example .env    # DATABASE_URL pointing at any Postgres
npm run db:push
npm run dev
npx tsx scripts/render-smoke.mts   # renders BTC/ETH print files without a database
```

### Keys

| Variable | Needed for |
|---|---|
| `PRINTFUL_API_TOKEN`, `PRINTFUL_STORE_ID` | mockups, catalog prices, orders |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | checkout: cards and crypto (`sk_test_…` shows a test-mode banner) |
| `BRANDFETCH_CLIENT_ID`, `COINGECKO_DEMO_KEY` | better logo coverage and rate limits (optional) |
| `ADMIN_TOKEN` | `/admin`, `/api/generate`, `/api/admin/*` |

Checkout stays closed until both Stripe values are set, and ships only to `SHIP_COUNTRIES`. To take crypto, turn on **Crypto** in Stripe Dashboard → Settings → Payment methods; Checkout then offers it automatically.

## Admin

`/admin` takes the `ADMIN_TOKEN`. From there you can generate products, enable or disable them, and manage the exact-logo allowlist. Products without Printful mockups stay drafts and don't appear in the shop.

## License

MIT for the code. Coin names and logos belong to their projects. Designs are fan-made and not affiliated with or endorsed by them.
