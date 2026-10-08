import Link from "next/link";
import { getRecentPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drops: CryptoThreads" };

export default async function BlogIndex() {
  const posts = await getRecentPosts(50);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="display text-[clamp(3.5rem,9vw,7rem)]">Drops</h1>
      <p className="mt-2 text-[var(--dim)]">New coins hit the rack as they trend. Here&apos;s every drop so far.</p>
      {posts.length ? (
        <ol className="mt-10 divide-y-2 divide-[var(--line)] border-y-2 border-[var(--line)]">
          {posts.map((p, i) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="group flex items-baseline gap-6 py-6">
                <span className="display w-24 shrink-0 text-4xl text-[var(--acid)]">
                  {String(posts.length - i).padStart(3, "0")}
                </span>
                <span>
                  <span className="display block text-3xl group-hover:text-[var(--acid)]">{p.title}</span>
                  {p.excerpt && <span className="mt-1 block text-[var(--dim)]">{p.excerpt}</span>}
                  <span className="mt-1 block text-sm text-[var(--dim)]">
                    {new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </span>
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
