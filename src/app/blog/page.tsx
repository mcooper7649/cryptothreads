import Link from "next/link";
import { getRecentPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function BlogIndex() {
  const posts = await getRecentPosts(20);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-black">Drops & dispatches</h1>
      <p className="mb-8 text-white/60">
        New apparel and notes on what&apos;s moving in crypto — updated daily.
      </p>
      {posts.length ? (
        <div className="space-y-6">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="block rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]"
            >
              <div className="text-xs text-white/40">
                {new Date(p.publishedAt).toLocaleDateString()}
              </div>
              <h2 className="mt-1 text-xl font-bold">{p.title}</h2>
              {p.excerpt && <p className="mt-2 text-sm text-white/60">{p.excerpt}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-white/50">
          No posts yet — the daily drop agent will start publishing here soon.
        </div>
      )}
    </div>
  );
}
