# Trend collector

`collect.py` keeps the storefront fresh. Three times a day it:

1. reads crypto X (finance trends + top posts for a few searches, through the saved
   session in `X_STATE`, read-only), the top posts on crypto subreddits (RSS), crypto
   Polymarket's busiest non-price markets, CoinGecko's trending coins, and GeckoTerminal's
   trending DEX pools (only coins with ≥ $150k liquidity, ≥ $1M 24h volume and ≥ 1 day old);
2. asks Claude (`TRENDS_MODEL`, default `claude-opus-5-5`, low effort, refusal fallbacks
   on) for ~20 slogans in the house voice. Without `ANTHROPIC_API_KEY` it falls back to
   the local Ollama model (`TRENDS_OLLAMA_MODEL`, default `qwen2.5:14b-instruct`);
3. posts the ones the writer rates ≥ 6 (up to 12 of 30) to `POST /api/admin/trending`, which runs
   `src/lib/trend-filter.ts` (length, glyphs, brands, people, politics, slurs, duplicates;
   tickers too), renders a preview and **publishes immediately** for 4 days. A slogan seen
   again gets its expiry extended. Tickers from the vetted lists (CoinGecko, DEX, majors)
   print type-only when no logo resolves. Reworded repeats of live jokes are rejected, and a
   batch holds at most 2 of a style (1 of receipt/chart/stamp/box) and 4 on one coin;
4. calls `POST /api/admin/maintain`, which publishes calendar designs
   (`src/lib/events.ts`), pins proven sellers (≥ 1 order, ≥ 3 carts or ≥ 25 likes) so
   they stay in the studio, ends duds early (≥ 40 views, no carts after 48h), retires
   coin products whose 24h volume drops under $2M (back above $4M → back in the shop),
   and prints community ideas that reached 5 votes, and closes checkouts unpaid for a week;
5. starts a background job (`POST /api/admin/productize?async=1&limit=30`) that gives the
   hottest live memes a tee each; 9+ adds a hoodie, and the rest of the lineup (women's,
   tanks, hat, mug, towel, backpack) waits until a meme earns it with carts, orders or views
   (LINEUP in `src/lib/productize.ts`), with
   Printful mockups, so they show in the shop and on coin pages (progress in
   `docker logs cryptothreads-app | grep productize`). Trend
   products whose slogan expired a day ago with no carts or orders go back to DRAFT;
   products of hidden slogans are disabled.

Hide anything bad in `/admin` (*Trending memes*, *Shill board*). Hidden slogans disappear
from the site and can't be checked out; orders already paid still print what was bought.

Settings come from the environment or the app's `.env`: `ADMIN_TOKEN`, `ANTHROPIC_API_KEY`, `SITE_URL`.

Cron on the homelab (needs Playwright and the `anthropic` package, so it uses the
world-monitor venv; shares the X session lock with the FloorFeed poster):

    15 2,14,20 * * * cd ~/cryptothreads && X_STATE=~/world-monitor/storage_state.json flock -w 600 /tmp/x_post.lock ~/world-monitor/venv/bin/python3 tools/trends/collect.py >> ~/cryptothreads/.data/trends.log 2>&1

`--dry-run` prints the candidates without publishing anything.
