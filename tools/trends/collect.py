#!/usr/bin/env python3
"""
Daily trend collector for the storefront's Trending section.

Reads what crypto X and Reddit are talking about, asks the local Ollama model to
turn it into short shirt slogans in the house voice, and posts them to
/api/admin/trending, which filters, renders and auto-publishes them (hide any in
/admin). Runs on the homelab from cron; see README.md next to this file.

  collect.py            collect and publish
  collect.py --dry-run  print the candidates, publish nothing
"""
import json, os, re, sys, time, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

API = os.environ.get("CT_API", "http://127.0.0.1:8040")
OLLAMA = os.environ.get("OLLAMA_URL", "http://192.168.68.110:11434")
MODEL = os.environ.get("TRENDS_MODEL", "qwen2.5:14b-instruct")
X_STATE = os.environ.get("X_STATE", "")  # saved X session (storage_state.json); X is skipped without it
SUBS = ["CryptoCurrency", "memecoins", "Bitcoin", "solana", "SatoshiStreetBets"]
X_SEARCHES = ["crypto meme", "memecoin", "crypto twitter"]
STYLES = ["slogan", "box", "chart", "receipt", "stamp", "pixel"]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"


def admin_token():
    if os.environ.get("ADMIN_TOKEN"):
        return os.environ["ADMIN_TOKEN"]
    env = Path(__file__).resolve().parents[2] / ".env"
    for line in env.read_text().splitlines():
        if line.startswith("ADMIN_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("ADMIN_TOKEN not set and not in .env")


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
    for sub in SUBS:
        try:
            root = ET.fromstring(http(f"https://www.reddit.com/r/{sub}/top/.rss?t=day&limit=25"))
            out += [("reddit", e.findtext("a:title", "", ns).strip()) for e in root.findall("a:entry", ns)]
        except Exception as e:
            print(f"reddit r/{sub}: {e}", file=sys.stderr)
        time.sleep(2)
    return out


def coingecko():
    try:
        data = json.loads(http("https://api.coingecko.com/api/v3/search/trending"))
        return [c["item"]["symbol"].upper() for c in data.get("coins", [])[:10]]
    except Exception as e:
        print(f"coingecko: {e}", file=sys.stderr)
        return []


def x_posts():
    """Finance trends plus a few top searches, read through the saved session. One visit per page, no posting."""
    if not X_STATE or not os.path.exists(X_STATE):
        print("X skipped: no X_STATE", file=sys.stderr)
        return []
    from playwright.sync_api import sync_playwright

    out = []
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
            for q in X_SEARCHES:
                time.sleep(5)
                pg.goto(f"https://x.com/search?q={urllib.request.quote(q)}&src=typed_query&f=top", wait_until="domcontentloaded")
                time.sleep(7)
                for t in pg.locator("article [data-testid=tweetText]").all()[:15]:
                    out.append(("x", t.inner_text().replace("\n", " ")[:280]))
        except Exception as e:
            print(f"x: {e}", file=sys.stderr)
        b.close()
    return out


PROMPT = """You write slogans for CryptoThreads, a crypto streetwear shop. Each slogan is printed big on a black t-shirt.

House voice (existing slogans, do NOT repeat these or the "already live" ones):
{existing}

Already live as trending: {live}

Here is what crypto X and Reddit are posting today:
{posts}

Coins trending on CoinGecko today: {coins}

Write {n} NEW slogans that riff on today's themes, moods and jokes. Rules:
- 1 to 3 lines, each line at most 12 characters, ALL CAPS, only letters, digits, spaces and $'!?,.&()#%+-/
- A crypto person would laugh and wear it. Self-deprecating degen humor works best.
- NEVER name a real person, company, exchange, brand, team, cartoon or meme character, or political topic.
- No profanity, slurs, violence, sex, drugs, or promises of gains (no 100x, no giveaways, no airdrops).
- Don't copy a post word for word. Distill the joke.
- ticker: a coin it fits, from the CoinGecko list or BTC, ETH, SOL, DOGE, XRP. No $ sign.
- style: one of {styles}. chart suits pump/dump jokes, receipt suits losses, stamp suits "club" identity, pixel suits gaming jokes, box and slogan suit anything.
- blurb: under 70 characters, plain words, what it riffs on (for example "Everyone on X says crypto is back. Again."). No names, no @handles.
- strength: 1-10, how funny and wearable it is.

Reply with JSON only: {{"slogans": [{{"lines": ["..."], "ticker": "...", "style": "...", "blurb": "...", "strength": 7, "source": "x" or "reddit"}}]}}"""


def write_slogans(posts, coins, existing, live, n=12):
    body = {
        "model": MODEL,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.8, "num_ctx": 8192},
        "messages": [{
            "role": "user",
            "content": PROMPT.format(
                existing="\n".join(f"- {' / '.join(l)}" for l in existing),
                live="; ".join(" ".join(l) for l in live) or "none",
                posts="\n".join(f"[{s}] {t}" for s, t in posts),
                coins=", ".join(coins) or "none",
                n=n,
                styles=", ".join(STYLES),
            ),
        }],
    }
    raw = json.loads(http(f"{OLLAMA}/api/chat", body, timeout=600))["message"]["content"]
    return json.loads(raw).get("slogans", [])


def library_slogans():
    """The fixed slogan library, read from the source so this script needs no Node."""
    src = (Path(__file__).resolve().parents[2] / "src/lib/design/styles.ts").read_text()
    return [re.findall(r'"([^"]+)"', m) for m in re.findall(r"lines: \[([^\]]+)\]", src)]


def main():
    dry = "--dry-run" in sys.argv
    token = admin_token()
    live = []
    try:
        entries = json.loads(http(f"{API}/api/admin/trending", headers={"x-admin-token": token}))["entries"]
        live = [e["lines"] for e in entries if not e["hidden"]]
    except Exception as e:
        print(f"couldn't read live trending: {e}", file=sys.stderr)

    posts = reddit() + x_posts()
    coins = coingecko()
    # Drop link spam and near-empty posts, keep the prompt a sane size.
    posts = [(s, re.sub(r"https?://\S+", "", t).strip()) for s, t in posts]
    posts = [(s, t) for s, t in posts if len(t) > 12][:120]
    print(f"{len(posts)} posts ({sum(s == 'x' for s, _ in posts)} from X), coins: {', '.join(coins)}")
    if len(posts) < 10:
        sys.exit("too little input today, skipping")

    slogans = write_slogans(posts, coins, library_slogans(), live)
    candidates = [
        {
            "lines": [str(l) for l in s.get("lines", [])][:5],
            "ticker": str(s.get("ticker", ""))[:12],
            "style": str(s.get("style", ""))[:20],
            "blurb": str(s.get("blurb", ""))[:140],
            "source": str(s.get("source", "x"))[:20],
            "score": float(s.get("strength", 5) or 5),
        }
        for s in slogans
        if isinstance(s, dict) and s.get("lines")
    ][:30]
    for c in candidates:
        print(f"  {c['score']:>4} {' / '.join(c['lines']):<36} ${c['ticker']:<6} {c['style']:<8} {c['blurb']}")
    if dry or not candidates:
        return
    res = json.loads(http(f"{API}/api/admin/trending", {"candidates": candidates}, {"x-admin-token": token}, timeout=600))
    print(f"published {len(res['created'])}, refreshed {len(res['refreshed'])}, rejected {len(res['rejected'])}")
    for r in res["rejected"]:
        print(f"  rejected {' / '.join(r['lines'])}: {r['reason']}")


if __name__ == "__main__":
    main()
