import { getActiveProducts } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Shop() {
  const products = await getActiveProducts(60);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-black">Shop all drops</h1>
      <p className="mb-8 text-white/60">Every piece printed on demand. Pay in crypto or card.</p>
      {products.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-white/50">
          Nothing here yet.{" "}
          <Link href="/generate" className="text-[var(--accent-2)] underline">Design the first drop →</Link>
        </div>
      )}
    </div>
  );
}
