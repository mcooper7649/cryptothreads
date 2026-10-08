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
