import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Not found", robots: { index: false } };
  const description = post.excerpt ?? post.bodyMdx.replace(/[#*_>`]/g, "").slice(0, 155);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description, publishedTime: post.publishedAt.toISOString() },
  };
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-sm text-[var(--dim)]">
        {new Date(post.publishedAt).toLocaleDateString()}
      </div>
      <h1 className="display mt-2 text-[clamp(3rem,7vw,5.5rem)]">{post.title}</h1>
      {/* bodyMdx is plain markdown for now; rendered as preformatted prose. */}
      <div className="mt-8 whitespace-pre-wrap text-lg leading-relaxed text-[var(--white)]">
        {post.bodyMdx}
      </div>
    </article>
  );
}
