import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-xs text-white/40">
        {new Date(post.publishedAt).toLocaleDateString()}
      </div>
      <h1 className="mt-1 text-4xl font-black">{post.title}</h1>
      {/* bodyMdx is plain markdown for now; rendered as preformatted prose. */}
      <div className="prose prose-invert mt-8 whitespace-pre-wrap leading-relaxed text-white/80">
        {post.bodyMdx}
      </div>
    </article>
  );
}
