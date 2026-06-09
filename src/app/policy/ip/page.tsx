export const metadata = { title: "IP & Takedown Policy — CryptoThreads" };

export default function IpPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 leading-relaxed text-white/80">
      <h1 className="text-3xl font-black text-white">IP &amp; Takedown Policy</h1>

      <p className="mt-6">
        CryptoThreads creates fan-made apparel inspired by cryptocurrency projects. Our
        designs are independently produced and are <strong>not affiliated with, sponsored
        by, or endorsed by</strong> any project, token, or foundation referenced.
      </p>

      <h2 className="mt-8 text-xl font-bold text-white">Stylized by default</h2>
      <p className="mt-2">
        Most designs are <em>stylized</em> — original typographic and graphic
        interpretations built around a ticker, rather than reproductions of a logo. Exact
        logo reproductions are produced only for projects that have been added to our
        cleared allowlist (e.g. open-source or community brands that permit merchandise).
      </p>

      <h2 className="mt-8 text-xl font-bold text-white">Rights holders — request a takedown</h2>
      <p className="mt-2">
        If you hold rights to a brand or logo and want a design removed, email{" "}
        <a className="text-[var(--accent-2)] underline" href="mailto:legal@cryptothreads.example">
          legal@cryptothreads.example
        </a>{" "}
        with the design URL and proof of rights. We remove verified designs promptly and
        permanently disable the corresponding product.
      </p>

      <p className="mt-8 text-sm text-white/50">
        Our print partner also performs independent intellectual-property review and may
        decline to fulfill designs it flags.
      </p>
    </div>
  );
}
