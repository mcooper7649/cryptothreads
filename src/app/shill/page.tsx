import { ShillBoard } from "@/components/ShillBoard";
import { getBoard, PROMOTE_AT } from "@/lib/community";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Shill us yours",
  description: "Pitch a coin and a slogan for a shirt. Ideas that get enough votes are printed into the CryptoThreads trending drop.",
  alternates: { canonical: "/shill" },
};

export default async function ShillPage() {
  const board = await getBoard();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="display text-[clamp(3.5rem,9vw,7rem)]">Shill us yours</h1>
      <p className="mt-2 max-w-2xl text-[var(--dim)]">
        Got a coin and a line that belongs on a shirt? Drop it here. Anything that hits {PROMOTE_AT} votes gets
        printed into the trending drop, ready to buy.
      </p>
      <ShillBoard
        promoteAt={PROMOTE_AT}
        initial={board.map((s) => ({ id: s.id, lines: s.lines, ticker: s.ticker, votes: s.votes, promoted: s.status === "PROMOTED", sloganId: s.sloganId }))}
      />
    </div>
  );
}
