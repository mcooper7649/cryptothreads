# Trend collector

`collect.py` fills the storefront's **Trending** section. Once a day it:

1. reads crypto X (finance trends + top posts for a few searches, through the saved
   session in `X_STATE`, read-only) and the day's top posts on crypto subreddits (RSS),
   plus CoinGecko's trending coins;
2. asks the local Ollama model (`qwen2.5:14b-instruct` on the GPU VM) for ~12 short
   slogans in the house voice;
3. posts them to `POST /api/admin/trending`, which runs `src/lib/trend-filter.ts`
   (length, glyphs, brands, people, politics, slurs, duplicates), renders a preview
   and **publishes immediately** for 7 days. A slogan seen again gets its expiry extended.

Hide anything bad in `/admin` → *Trending memes*. Hidden slogans disappear from the
site and can't be checked out; orders already paid still print what was bought.

Cron on the homelab (needs Playwright, so it uses the world-monitor venv):

    15 14 * * * cd ~/cryptothreads && X_STATE=~/world-monitor/storage_state.json flock -w 600 /tmp/x_post.lock ~/world-monitor/venv/bin/python3 tools/trends/collect.py >> ~/cryptothreads/.data/trends.log 2>&1

`--dry-run` prints the candidates without publishing.
