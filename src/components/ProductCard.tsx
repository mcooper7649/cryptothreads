import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductWithDesign } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductWithDesign }) {
  const img = product.mockupUrls[0] || product.design.previewUrl || "";
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:border-[var(--accent)]"
    >
      <div className="checkerboard aspect-square overflow-hidden rounded-xl">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.title}
            className="h-full w-full object-contain transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/30">no preview</div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="truncate text-sm font-medium">{product.title}</span>
        <span className="text-sm text-[var(--accent-2)]">{formatPrice(product.priceCents)}</span>
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-white/40">{product.blankType}</div>
    </Link>
  );
}
