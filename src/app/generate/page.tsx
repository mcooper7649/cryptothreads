import { GenerateClient } from "@/components/GenerateClient";
import { isStyle } from "@/lib/design/styles";
import { findSlogan, getTrending, TRENDING_PREFIX } from "@/lib/slogans";
import { headers } from "next/headers";
import { bumpSlogan, isBot } from "@/lib/signals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Make your own crypto shirt",
  description:
    "Design a crypto shirt in seconds: type any ticker or project website, pick a meme and a style, and we print it on a tee, hoodie or sticker.",
  alternates: { canonical: "/generate" },
};

export default async function GeneratePage({ searchParams }: { searchParams: { q?: string; style?: string; slogan?: string } }) {
  const [trending, initial] = await Promise.all([getTrending(16, true), findSlogan(searchParams.slogan?.slice(0, 64))]);
  // Opening a trending meme in the studio counts as a view of it.
  if (initial?.id.startsWith(TRENDING_PREFIX) && !isBot(headers().get("user-agent"))) void bumpSlogan(initial.id, "views");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="display text-[clamp(3.5rem,9vw,7rem)]">Make your own</h1>
      <p className="mt-2 max-w-xl text-[var(--dim)]">
        Any coin, any meme. Type a ticker or paste a project&apos;s website, pick a style, and
        watch it render. We print it after you check out.
      </p>
      <div className="mt-10">
        <GenerateClient
          initialQuery={searchParams.q?.slice(0, 64) ?? ""}
          initialStyle={isStyle(searchParams.style) ? searchParams.style : undefined}
          initialSlogan={initial?.id}
          trending={trending.map((t) => ({ id: t.id, lines: t.lines }))}
        />
      </div>
    </div>
  );
}
