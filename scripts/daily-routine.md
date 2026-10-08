# Daily Drop — Claude scheduled routine

This is the spec for the **Claude scheduled remote agent** that keeps CryptoThreads
fresh. Register it with the `/schedule` skill (cron, ~09:00 ET) like the existing
mycodedojo 9am routine.

## Goal
Each day, publish 1–3 new apparel drops for coins that are trending, plus a short,
genuinely useful blog post about them.

## Inputs / secrets the agent needs
- `SITE` = deployed base URL (e.g. https://cryptothreads.example)
- `ADMIN_TOKEN` = bearer token for admin/generate endpoints

## Steps
1. **Pick coins.** `GET https://api.coingecko.com/api/v3/search/trending` → take the top
   2–3 by `market_cap_rank`. Skip anything obviously NSFW or a known scam.
2. **Generate products.** For each coin, call:
   `POST {SITE}/api/generate`  `Authorization: Bearer {ADMIN_TOKEN}`
   `{ "query": "<SYMBOL>", "blankType": "<blank>", "mode": "STYLIZED", "style": "<style>", "slogan": "<slogan>" }`
   Make 2–3 pieces per coin and vary them: at least one `slogan` (meme) tee, plus other
   styles on other blanks. Styles: ticker, box, slogan, chart, receipt, stamp, pixel.
   Blanks: tee, boxy, longsleeve, crewneck, hoodie, sticker. Slogan ids are in
   `src/lib/design/styles.ts` (coin in-jokes like `such-wow` only for their coin).
   Capture each returned `product.slug` and `priceCents`.
3. **Write the post.** Compose ~150–250 words of *real* commentary: what the project
   does, why it's trending today (price move, news, launch), and a line about the drop.
   Avoid hype and financial advice; link each product as `/product/<slug>`.
4. **Publish.** `POST {SITE}/api/admin/posts` `Authorization: Bearer {ADMIN_TOKEN}`
   `{ "title", "excerpt", "bodyMdx", "coinRefs": ["SYM", ...] }`
5. **Refresh (optional).** If a `VERCEL_DEPLOY_HOOK_URL` is configured, POST to it.
6. **Report.** Summarize what dropped (symbols + slugs) to the status line / Telegram.

## Notes
- EXACT-logo mode is gated server-side by the allowlist; default to STYLIZED.
- The deterministic fallback `scripts/daily-drop.mts` performs steps 1–5 headlessly if
  the agent can't run on a given day.
