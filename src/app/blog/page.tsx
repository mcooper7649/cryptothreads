import Link from "next/link";
import { getRecentPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Drops",
  description: "Every CryptoThreads drop: new memes off the crypto timeline, printed on tees, hoodies, hats and mugs as they land.",
  alternates: { canonical: "/blog" },
};

const sameOrigin = (u: string | null) => (u ? u.replace(/^https?:\/\/[^/]+/, "") : "");
const fmt = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function DropsIndex() {
  const posts = await getRecentPosts(60);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="display text-[clamp(3.5rem,9vw,7rem)]">Drops</h1>
      <p className="mt-2 max-w-2xl text-[var(--dim)]">
        Up to three a day. Each drop is what crypto Twitter is going through right now, turned into
        shirts, hoodies, hats and mugs. Printed when you order.
      </p>
      {posts.length ? (
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="group block h-full border-2 border-[var(--line)] transition-colors hover:border-[var(--acid)]">
                <div className="garment relative aspect-[5/4] overflow-hidden">
                  {p.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sameOrigin(p.coverUrl)} alt="" className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  )}
                  <span className="display absolute left-3 top-3 bg-[var(--acid)] px-2 py-0.5 text-2xl text-[var(--ink)]">
                    {String(posts.length - i).padStart(3, "0")}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-[var(--dim)]">
                    {fmt(p.publishedAt)} · {p.sloganIds.length || p.productIds.length} designs · {p.productIds.length} pieces
                  </p>
                  <h2 className="display mt-1 text-3xl group-hover:text-[var(--acid)]">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 line-clamp-3 text-[var(--dim)]">{p.excerpt}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-10 border-2 border-dashed border-[var(--line)] p-12 text-center text-[var(--dim)]">
          First drop lands soon. <Link href="/shop" className="text-[var(--acid)] underline">Shop what&apos;s live</Link>.
        </p>
      )}
    </div>
  );
}
