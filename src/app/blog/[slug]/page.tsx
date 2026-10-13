import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getPostBySlug } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { abs, onSite } from "@/lib/seo";

export const dynamic = "force-dynamic";

const sameOrigin = (u: string | null) => (u ? u.replace(/^https?:\/\/[^/]+/, "") : "");

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Not found", robots: { index: false } };
  const description = post.excerpt ?? post.bodyMdx.replace(/[#*_>`]/g, "").slice(0, 155);
  const image = onSite(post.coverUrl);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description, publishedTime: post.publishedAt.toISOString(), ...(image ? { images: [{ url: image }] } : {}) },
  };
}

export default async function DropPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const [slogans, products, number] = await Promise.all([
    prisma.trendingSlogan.findMany({ where: { id: { in: post.sloganIds } } }),
    // Live, by slogan: products finished after the drop was posted belong to it too.
    prisma.product.findMany({
      where: post.sloganIds.length ? { status: "ACTIVE", design: { slogan: { in: post.sloganIds } } } : { id: { in: post.productIds }, status: "ACTIVE" },
      include: { design: { include: { logo: true } } },
    }),
    prisma.contentPost.count({ where: { publishedAt: { lte: post.publishedAt } } }),
  ]);
  const sections = post.sloganIds
    .map((id) => slogans.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s && !s.hidden)
    .map((s) => ({ s, items: products.filter((p) => p.design.slogan === s.id) }))
    .filter((x) => x.items.length);
  // Older text-only posts have no sections; show their body as written.
  const legacy = !post.sloganIds.length;

  return (
    <article className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          datePublished: post.publishedAt.toISOString(),
          image: onSite(post.coverUrl),
          url: abs(`/blog/${post.slug}`),
          publisher: { "@type": "Organization", name: "CryptoThreads" },
        }}
      />
      <nav className="mb-6 text-sm text-[var(--dim)]">
        <Link href="/blog" className="hover:text-[var(--acid)]">Drops</Link> / {String(number).padStart(3, "0")}
      </nav>
      <span className="display inline-block -rotate-2 bg-[var(--red)] px-3 py-1 text-xl text-white">
        Drop {String(number).padStart(3, "0")} ·{" "}
        {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
      </span>
      <h1 className="display mt-4 text-[clamp(3rem,8vw,6.5rem)]">{post.title}</h1>
      <p className={`mt-4 max-w-2xl text-lg ${legacy ? "whitespace-pre-wrap" : "text-[var(--dim)]"}`}>{post.bodyMdx}</p>

      <div className="mt-12 space-y-16">
        {sections.map(({ s, items }) => (
          <section key={s.id} className="grid gap-6 border-t-2 border-[var(--line)] pt-8 lg:grid-cols-[280px_1fr]">
            <div>
              <div className="garment aspect-[5/6] border-2 border-[var(--line)] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sameOrigin(s.previewUrl)} alt={`${s.ticker} “${s.lines.join(" ")}” design`} className="h-full w-full object-contain" loading="lazy" />
              </div>
              <h2 className="display mt-3 text-3xl">{s.lines.join(" ")}</h2>
              <p className="mt-1 text-[var(--dim)]">{s.blurb}</p>
              <Link href={`/generate?q=${s.ticker}&style=${s.style}&slogan=${s.id}`} className="mt-2 inline-block text-sm text-[var(--acid)] underline">
                Put it on another coin or blank
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-16 text-sm text-[var(--dim)]">
        Fan-made designs, not affiliated with any project. Not financial advice. Financial fashion.
      </p>
    </article>
  );
}
