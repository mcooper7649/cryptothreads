import { supportEmail } from "@/lib/store-config";

export const metadata = { title: "IP & Takedown Policy: CryptoThreads" };
export const dynamic = "force-dynamic";

export default function IpPolicy() {
  const email = supportEmail();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 leading-relaxed text-[var(--white)]">
      <h1 className="display text-6xl">IP &amp; Takedown Policy</h1>

      <p className="mt-6">
        CryptoThreads creates fan-made apparel inspired by cryptocurrency projects. Our
        designs are independently produced and are <strong>not affiliated with, sponsored
        by, or endorsed by</strong> any project, token, or foundation referenced.
      </p>

      <h2 className="display mt-10 text-3xl">Stylized by default</h2>
      <p className="mt-2">
        Most designs are <em>stylized</em>: original typographic and graphic
        interpretations built around a ticker and slogan, rather than reproductions of a logo. Exact
        logo reproductions are produced only for projects that have been added to our
        cleared allowlist (e.g. open-source or community brands that permit merchandise).
      </p>

      <h2 className="display mt-10 text-3xl">Rights holders — request a takedown</h2>
      <p className="mt-2">
        If you hold rights to a brand or logo and want a design removed,{" "}
        {email ? (
          <>
            email <a className="text-[var(--acid)] underline" href={`mailto:${email}`}>{email}</a>
          </>
        ) : (
          "use the contact link in the footer"
        )}{" "}
        with the design URL and proof of rights. We remove verified designs promptly and
        permanently disable the corresponding product.
      </p>

      <p className="mt-8 text-sm text-[var(--dim)]">
        Our print partner also performs independent intellectual-property review and may
        decline to fulfill designs it flags.
      </p>
    </div>
  );
}
