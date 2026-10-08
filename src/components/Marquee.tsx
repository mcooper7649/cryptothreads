const ITEMS = [
  "HODL",
  "WAGMI",
  "NUMBER GO UP",
  "PRINTED ON DEMAND",
  "PAY IN USDC OR CARD",
  "$5 FLAT SHIPPING (US)",
  "NOT FINANCIAL ADVICE",
  "FEW UNDERSTAND",
  "ANY COIN. ANY MEME.",
];

/** Acid ticker tape across the top of every page. */
export function Marquee() {
  const run = (
    <div aria-hidden="true">
      {ITEMS.map((t) => (
        <span key={t} className="display px-5 text-lg">
          {t} <span className="text-[var(--red)]">★</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee bg-[var(--acid)] py-1.5 text-[var(--ink)]">
      <span className="sr-only">{ITEMS.join(", ")}</span>
      {run}
      {run}
    </div>
  );
}
