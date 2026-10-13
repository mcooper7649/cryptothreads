#!/usr/bin/env python3
"""
Trend collector for the storefront's Trending section, run three times a day.

Reads what crypto X and Reddit are talking about, which coins are moving on the
DEXes (GeckoTerminal) and CoinGecko, and what crypto Polymarket is betting on;
asks Claude (or the local Ollama model when ANTHROPIC_API_KEY isn't set) to turn
it into short shirt slogans in the house voice, and posts them to
/api/admin/trending, which filters, renders and auto-publishes them (hide any in
/admin). Then it hands the best new one to the @FloorFeed poster, reads likes on
earlier ones back off X, and runs the shop's freshness pass (/api/admin/maintain).
Runs on the homelab from cron; see README.md next to this file.

  collect.py            collect and publish
  collect.py --dry-run  print the candidates, publish nothing
"""
import json, os, re, sys, time, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

API = os.environ.get("CT_API", "http://127.0.0.1:8040")
OLLAMA = os.environ.get("OLLAMA_URL", "http://192.168.68.110:11434")
OLLAMA_MODEL = os.environ.get("TRENDS_OLLAMA_MODEL", "qwen2.5:14b-instruct")
CLAUDE_MODEL = os.environ.get("TRENDS_MODEL", "claude-opus-5-5")
FLOORFEED = os.environ.get("FLOORFEED_API", "http://127.0.0.1:8030")
MAJORS = {"BTC", "ETH", "SOL", "DOGE", "XRP", "BNB", "ADA", "LINK", "AVAX", "SUI", "PEPE", "SHIB", "WIF", "BONK", "TRX", "LTC", "TON"}
# DEX coins must have real money behind them before we print their ticker.
DEX_MIN_LIQ = 150_000
DEX_MIN_VOL = 1_000_000
DEX_MIN_AGE_H = 24
QUOTES = {"WETH", "ETH", "SOL", "WSOL", "USDC", "USDT", "WBTC", "CBBTC", "USD1", "DAI", "BNB", "WBNB"}
X_STATE = os.environ.get("X_STATE", "")  # saved X session (storage_state.json); X is skipped without it
SUBS = ["CryptoCurrency", "memecoins", "Bitcoin", "solana", "SatoshiStreetBets"]
# Only posts people actually engaged with, from the last two days: keyword search
# alone returns reply-farming bait ("shill me a memecoin under 10M").
X_SEARCHES = [
    '(crypto OR memecoin OR onchain OR altcoins OR "crypto twitter") min_faves:1500 -filter:replies lang:en since:{since}',
    '(airdrop OR perps OR liquidated OR jeets OR "dev sold" OR rugged OR bonded OR trenches) min_faves:400 -filter:replies lang:en since:{since}',
    '(bitcoin OR ethereum OR solana) min_faves:3000 -filter:replies lang:en since:{since}',
]
ACCOUNTS_PER_RUN = 10
# Engagement bait, giveaways and shill requests: never culture, always noise.
BAIT = re.compile(
    r"shill me|which (#?meme ?coin|coin|token|#?memecoin)|what (#?meme ?coin|coin|token|#?memecoin)|drop your|"
    r"tell me about your|i will (read|answer|follow)|giveaway|like (and|&) (rt|retweet)|follow me|"
    r"\b1000x\b.*\?|\b100x\b.*\?|under \d+k? ?m?c\b|make me buy|ready for this bull",
    re.I,
)
STYLES = ["slogan", "box", "chart", "receipt", "stamp", "pixel"]
MIN_SCORE = float(os.environ.get("TRENDS_MIN_SCORE", "6"))
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"


def env(name, default=""):
    """From the environment, else the app's .env next to the repo root."""
    if os.environ.get(name):
        return os.environ[name]
    path = Path(__file__).resolve().parents[2] / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"')
    return default


def admin_token():
    return env("ADMIN_TOKEN") or sys.exit("ADMIN_TOKEN not set and not in .env")


def http(url, body=None, headers=None, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    if body is not None:
        req.data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def reddit():
    """Top posts of the day. Reddit's JSON API 403s from here; the RSS feed doesn't."""
    out = []
    ns = {"a": "http://www.w3.org/2005/Atom"}
    # Three runs a day share Reddit's unauthenticated RSS limit, so each run reads
    # three of the subreddits, rotating by hour, with long gaps between them.
    start = time.gmtime().tm_hour % len(SUBS)
    for sub in (SUBS * 2)[start:start + 3]:
        for attempt in range(2):
            try:
                root = ET.fromstring(http(f"https://www.reddit.com/r/{sub}/top/.rss?t=day&limit=25"))
                out += [("reddit", e.findtext("a:title", "", ns).strip()) for e in root.findall("a:entry", ns)]
                break
            except Exception as e:
                print(f"reddit r/{sub}: {e}", file=sys.stderr)
                if "429" not in str(e):
                    break
                time.sleep(60)  # unauthenticated RSS is rate limited hard
        time.sleep(30)
    return out


def coingecko():
    try:
        data = json.loads(http("https://api.coingecko.com/api/v3/search/trending"))
        return [c["item"]["symbol"].upper() for c in data.get("coins", [])[:10]]
    except Exception as e:
        print(f"coingecko: {e}", file=sys.stderr)
        return []


def dex_coins():
    """Trending DEX pools (GeckoTerminal, all chains) with real liquidity and volume: the new coins before CoinGecko lists them."""
    out, seen = [], set()
    for page in (1, 2):
        try:
            d = json.loads(http(f"https://api.geckoterminal.com/api/v2/networks/trending_pools?include=base_token&page={page}"))
        except Exception as e:
            print(f"geckoterminal: {e}", file=sys.stderr)
            break
        tokens = {i["id"]: i["attributes"] for i in d.get("included", [])}
        for p in d.get("data", []):
            a = p["attributes"]
            tok = tokens.get(p["relationships"]["base_token"]["data"]["id"], {})
            sym = re.sub(r"[^A-Z0-9]", "", (tok.get("symbol") or "").upper())
            try:
                liq, vol = float(a.get("reserve_in_usd") or 0), float((a.get("volume_usd") or {}).get("h24") or 0)
                age_h = (time.time() - time.mktime(time.strptime(a["pool_created_at"][:19], "%Y-%m-%dT%H:%M:%S"))) / 3600
            except Exception:
                continue
            if not (2 <= len(sym) <= 10) or sym in QUOTES or sym in seen:
                continue
            if liq < DEX_MIN_LIQ or vol < DEX_MIN_VOL or age_h < DEX_MIN_AGE_H:
                continue
            seen.add(sym)
            out.append({"symbol": sym, "name": tok.get("name", ""), "liq": liq, "vol": vol, "age_d": age_h / 24})
        time.sleep(3)
    return out


def polymarket():
    """What crypto Polymarket is betting on, minus the daily price ladders."""
    try:
        events = json.loads(http("https://gamma-api.polymarket.com/events?closed=false&order=volume24hr&ascending=false&limit=40&tag_slug=crypto"))
    except Exception as e:
        print(f"polymarket: {e}", file=sys.stderr)
        return []
    titles = [e.get("title", "") for e in events]
    return [("polymarket", "Bettors are wagering on: " + t) for t in titles if t and not re.search(r"\bprice\b|above|below|hit .* (in|on|by)|up or down", t, re.I)][:10]


def floorfeed(method, path, body=None):
    token = env("FLOORFEED_SOCIAL_TOKEN")
    if not token:
        return None
    return json.loads(http(f"{FLOORFEED}{path}", body, {"Authorization": f"Bearer {token}"}) or b"null")


def x_posts(merch=()):
    """Finance trends plus a few top searches, read through the saved session. One visit per page, no posting.
    Also reads like counts off our earlier @FloorFeed drop posts (merch). Returns (posts, likes)."""
    if not X_STATE or not os.path.exists(X_STATE):
        print("X skipped: no X_STATE", file=sys.stderr)
        return [], []
    from playwright.sync_api import sync_playwright

    out, likes = [], []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
        ctx = b.new_context(storage_state=X_STATE, user_agent=UA, viewport={"width": 1280, "height": 1800})
        pg = ctx.new_page()
        try:
            pg.goto("https://x.com/explore/tabs/news", wait_until="domcontentloaded")
            time.sleep(7)
            for t in pg.locator("[data-testid=trend]").all()[:30]:
                txt = t.inner_text().replace("\n", " | ")
                if "Business and finance" in txt or "crypto" in txt.lower():
                    out.append(("x", "Trending topic: " + txt.split("|")[-1].strip()))
            since = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 2 * 86400))
            for q in X_SEARCHES:
                time.sleep(5)
                pg.goto(f"https://x.com/search?q={urllib.request.quote(q.format(since=since))}&src=typed_query&f=top", wait_until="domcontentloaded")
                time.sleep(7)
                for t in pg.locator("article [data-testid=tweetText]").all()[:15]:
                    out.append(("x", t.inner_text().replace("\n", " ")[:280]))
            for handle in accounts():
                time.sleep(5)
                pg.goto(f"https://x.com/{handle}", wait_until="domcontentloaded")
                time.sleep(6)
                n = 0
                for a in pg.locator("article").all()[:8]:
                    if n >= 5:
                        break
                    if a.locator("[data-testid=socialContext]").count():  # pinned or reposted
                        continue
                    txt = a.locator("[data-testid=tweetText]")
                    if txt.count():
                        out.append(("x", f"@{handle}: " + txt.first.inner_text().replace("\n", " ")[:280]))
                        n += 1
        except Exception as e:
            print(f"x: {e}", file=sys.stderr)
        for m in list(merch)[:5]:
            try:
                time.sleep(5)
                pg.goto(m["post_url"], wait_until="domcontentloaded")
                time.sleep(6)
                btn = pg.locator("article [data-testid=like], article [data-testid=unlike]").first
                label = btn.get_attribute("aria-label") or ""
                n = re.search(r"([\d,]+)", label)
                likes.append({"id": m["key"].split(":", 1)[1], "likes": int(n.group(1).replace(",", "")) if n else 0, "tweetUrl": m["post_url"]})
            except Exception as e:
                print(f"x likes {m.get('post_url')}: {e}", file=sys.stderr)
        b.close()
    return out, likes


def accounts():
    """This run's slice of tools/trends/accounts.txt, rotating by hour so every account comes up each day."""
    path = Path(__file__).with_name("accounts.txt")
    handles = [l.strip().lstrip("@") for l in path.read_text().splitlines() if l.strip() and not l.startswith("#")] if path.exists() else []
    if not handles:
        return []
    start = (time.gmtime().tm_hour * ACCOUNTS_PER_RUN) % len(handles)
    return (handles * 2)[start:start + min(ACCOUNTS_PER_RUN, len(handles))]


PROMPT = """You write slogans for CryptoThreads, a crypto streetwear shop. Each slogan is printed big on a black t-shirt.

House voice (existing slogans, do NOT repeat these or the "already live" ones):
{existing}

Already live as trending: {live}

Here is what crypto X and Reddit are posting today:
{posts}

Coins trending on CoinGecko today: {coins}

New coins moving on the DEXes right now (real liquidity, at least a day old): {dex}

First, read the posts like someone who lives on crypto Twitter. Ignore engagement bait
("shill me", "which coin will 100x", giveaways) and generic boomer crypto jokes (HODL, moon,
lambo, "number go up"). Write down the 8-12 in-jokes, phrases, narratives and moods that are
actually going around TODAY: quote the exact words people are using where you can.

Then write {n} NEW slogans built only from that list. They should feel like they came from this
week's timeline, so someone on crypto Twitter gets the reference instantly and someone outside
doesn't quite: the current slang, the thing everyone got rekt on, the narrative everyone is
tired of, the phrase that keeps getting quote-tweeted.

They are JOKES and ATTITUDES, not news headlines. Read top to bottom, the lines form one phrase.
Shape (don't reuse): "BOUGHT THE / TOP / AGAIN", "GM / (COPE)".
Bad: headlines ("SEIZED / RESERVE / STRONG"), word lists ("XRP / LEADER / COMMUNITY"), generic
crypto jokes that could be from 2017 ("TO THE / MOON"), and anything not traceable to today's posts.
Rules:
- 1 to 3 lines, each line at most 12 characters, ALL CAPS, only letters, digits, spaces and $'!?,.&()#%+-/
- A crypto person would laugh and wear it.
- NEVER name a real person, company, exchange, protocol, app, brand, team, cartoon or meme character, or political topic (trademarks). Point at them with the slang instead.
- No profanity, slurs, violence, sex or drugs. Jokes about airdrops, 100x and getting rekt are fine; never promise gains.
- Don't copy a post word for word; distill it.
- ticker: the coin the joke is about. Use a CoinGecko/DEX coin only if the joke is about that coin; otherwise BTC, ETH, SOL, DOGE or XRP. No $ sign.
- style: one of {styles}. Wordy slogans (3 lines or 20+ characters) must use slogan, box or receipt; chart suits pump/dump jokes, stamp suits short "club" identity, pixel suits gaming jokes.
- blurb: under 70 characters, plain words, what it riffs on (for example "Everyone on X says crypto is back. Again."). No names, no @handles.
- strength: 1-10, how funny, current and wearable it is. Below 6 if the reference isn't from today's posts.

Reply with JSON only: {{"culture": ["..."], "slogans": [{{"lines": ["..."], "ticker": "...", "style": "...", "blurb": "...", "strength": 7, "source": "x" or "reddit" or "polymarket"}}]}}"""


def write_slogans(posts, coins, dex, existing, live, n=20):
    prompt = PROMPT.format(
        existing="\n".join(f"- {' / '.join(l)}" for l in existing),
        live="; ".join(" ".join(l) for l in live) or "none",
        posts="\n".join(f"[{s}] {t}" for s, t in posts),
        coins=", ".join(coins) or "none",
        dex=", ".join(f"{c['symbol']} ({c['name']}, ${c['vol'] / 1e6:.1f}M 24h volume)" for c in dex) or "none",
        n=n,
        styles=", ".join(STYLES),
    )
    raw = claude(prompt) if env("ANTHROPIC_API_KEY") else ollama(prompt)
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    data = json.loads(raw)
    for c in data.get("culture", []):
        print(f"  culture: {c}")
    return data.get("slogans", [])


def claude(prompt):
    """One call, low effort: the writing step is short, and humor doesn't need long thinking."""
    import anthropic

    client = anthropic.Anthropic(api_key=env("ANTHROPIC_API_KEY"))
    msg = client.beta.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": prompt}],
    )
    if msg.stop_reason == "refusal":
        raise RuntimeError("claude declined the slogan prompt")
    u = msg.usage
    print(f"claude {msg.model}: {u.input_tokens} in / {u.output_tokens} out")
    return "".join(b.text for b in msg.content if b.type == "text")


def ollama(prompt):
    body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.8, "num_ctx": 8192},
        "messages": [{"role": "user", "content": prompt}],
    }
    return json.loads(http(f"{OLLAMA}/api/chat", body, timeout=600))["message"]["content"]


def library_slogans():
    """The fixed slogan library, read from the source so this script needs no Node."""
    src = (Path(__file__).resolve().parents[2] / "src/lib/design/styles.ts").read_text()
    return [re.findall(r'"([^"]+)"', m) for m in re.findall(r"lines: \[([^\]]+)\]", src)]


EXAMPLES = [["BOUGHT THE", "TOP", "AGAIN"], ["MY BAGS", "ARE", "HEAVY"], ["GM", "(COPE)"]]
squash = lambda lines: re.sub(r"[^a-z0-9]", "", "".join(lines).lower())


def cross_post(token, created):
    """Hand the best new slogan to the @FloorFeed poster (FloorFeed allows one a day)."""
    if not created or not env("FLOORFEED_SOCIAL_TOKEN"):
        return
    entries = {e["id"]: e for e in json.loads(http(f"{API}/api/admin/trending", headers={"x-admin-token": token}))["entries"]}
    best = max((entries[i] for i in created if i in entries), key=lambda e: e["score"], default=None)
    if not best:
        return
    site = env("SITE_URL", "https://cryptothreads.us").rstrip("/")
    link = f"{site}/generate?q={best['ticker']}&style={best['style']}&slogan={best['id']}"
    text = f"New on CryptoThreads: \"{' '.join(best['lines'])}\" 👕\n\n{best['blurb']}\n\n{link}"
    try:
        floorfeed("POST", "/social/draft", {"kind": "merch", "key": best["id"], "text": text, "image": best["previewUrl"]})
        print(f"cross-posted {best['id']} to @FloorFeed queue")
    except Exception as e:
        print(f"cross-post skipped: {e}", file=sys.stderr)


def main():
    dry = "--dry-run" in sys.argv
    token = admin_token()
    live = []
    try:
        entries = json.loads(http(f"{API}/api/admin/trending", headers={"x-admin-token": token}))["entries"]
        live = [e["lines"] for e in entries if not e["hidden"]]
    except Exception as e:
        print(f"couldn't read live trending: {e}", file=sys.stderr)

    merch = []
    try:
        merch = [m for m in (floorfeed("GET", "/social/posted?kind=merch&days=7") or []) if m.get("post_url")]
    except Exception as e:
        print(f"floorfeed posted: {e}", file=sys.stderr)

    xp, likes = x_posts(merch)
    posts = reddit() + xp + polymarket()
    coins = coingecko()
    dex = dex_coins()
    # Drop link spam and near-empty posts, keep the prompt a sane size.
    posts = [(s, re.sub(r"https?://\S+", "", t).strip()) for s, t in posts]
    posts = [(s, t) for s, t in posts if len(t) > 12 and not BAIT.search(t)][:150]
    print(f"{len(posts)} posts ({sum(s == 'x' for s, _ in posts)} from X), coins: {', '.join(coins)}, dex: {', '.join(c['symbol'] for c in dex)}")
    if len(posts) < 10:
        sys.exit("too little input today, skipping")

    library = library_slogans()
    slogans = write_slogans(posts, coins, dex, library, live)
    dex_syms = {c["symbol"] for c in dex}
    vetted = MAJORS | set(coins) | dex_syms
    # The model likes to hand back the examples and existing slogans; drop those.
    seen = {squash(l) for l in library + live + EXAMPLES}
    candidates = []
    for s in slogans:
        if not (isinstance(s, dict) and s.get("lines")) or squash(map(str, s["lines"])) in seen:
            continue
        ticker = re.sub(r"[^A-Z0-9]", "", str(s.get("ticker", "")).upper())[:12]
        candidates.append({
            "lines": [str(l) for l in s.get("lines", [])][:5],
            "ticker": ticker,
            "style": str(s.get("style", ""))[:20],
            "blurb": str(s.get("blurb", ""))[:140],
            "source": "dex" if ticker in dex_syms else str(s.get("source", "x"))[:20],
            "score": float(s.get("strength", 5) or 5),
            # Vetted tickers print type-only when no logo resolves instead of moving to BTC.
            "keepTicker": ticker in vetted,
        })
    if dry:
        for c in sorted(candidates, key=lambda c: -c["score"]):
            if c["score"] < MIN_SCORE:
                print(f"  (below {MIN_SCORE:g}) {c['score']:>4} {' / '.join(c['lines'])}")
    # Only the ones the writer itself rates as wearable go live.
    candidates = sorted((c for c in candidates if c["score"] >= MIN_SCORE), key=lambda c: -c["score"])[:8]
    for c in candidates:
        print(f"  {c['score']:>4} {' / '.join(c['lines']):<36} {c['ticker']:<7} {c['style']:<8} {c['source']:<10} {c['blurb']}")
    if dry:
        return
    if candidates:
        # Four days: meme cycles are short, and a slogan seen again gets its expiry pushed out.
        res = json.loads(http(f"{API}/api/admin/trending", {"ttlDays": 4, "candidates": candidates}, {"x-admin-token": token}, timeout=600))
        print(f"published {len(res['created'])}, refreshed {len(res['refreshed'])}, rejected {len(res['rejected'])}")
        for r in res["rejected"]:
            print(f"  rejected {' / '.join(r['lines'])}: {r['reason']}")
        cross_post(token, res["created"])

    m = json.loads(http(f"{API}/api/admin/maintain", {"likes": likes}, {"x-admin-token": token}, timeout=600))
    print(f"maintain: {json.dumps(m)}")
    # New memes become shop products (tees with Printful mockups); slow, so it goes last.
    p = json.loads(http(f"{API}/api/admin/productize", {}, {"x-admin-token": token}, timeout=1500))
    print(f"productize: {json.dumps(p)}")


if __name__ == "__main__":
    main()
