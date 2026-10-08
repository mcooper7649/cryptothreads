import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { BLANKS, isBlankType } from "@/lib/printful/blanks";
import type { ProductWithDesign } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductWithDesign }) {
  const img = product.mockupUrls[0] || product.design.previewUrl || "";
  const blank = isBlankType(product.blankType) ? BLANKS[product.blankType].short : product.blankType;
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="garment relative aspect-square overflow-hidden border-2 border-[var(--line)] transition-colors group-hover:border-[var(--acid)]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute left-2 top-2 bg-[var(--ink)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
          {blank}
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="display line-clamp-2 text-xl group-hover:text-[var(--acid)]">{product.title}</h3>
        <span className="price-tag shrink-0 text-lg">{formatPrice(product.priceCents)}</span>
      </div>
    </Link>
  );
}
