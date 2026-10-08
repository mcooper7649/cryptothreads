import { GenerateClient } from "@/components/GenerateClient";
import { isStyle } from "@/lib/design/styles";

export const metadata = { title: "Make your own: CryptoThreads" };

export default function GeneratePage({ searchParams }: { searchParams: { q?: string; style?: string } }) {
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
        />
      </div>
    </div>
  );
}
