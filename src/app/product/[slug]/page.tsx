import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/queries";
import { AddToCart } from "@/components/AddToCart";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Variant {
  variantId: number;
  size?: string;
  color?: string;
  priceCents?: number;
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const variants = (product.variants as unknown as Variant[]) ?? [];
  const sizes = Array.from(
    new Set(variants.map((v) => v.size).filter((s): s is string => !!s))
  );
  const images = product.mockupUrls.length
    ? product.mockupUrls
    : product.design.previewUrl
      ? [product.design.previewUrl]
      : [];

  // The coin query used to (re)generate the print file at fulfillment time.
  // Older rows predate the column, so fall back to the logo's ticker.
  const query = product.query ?? product.design.logo.symbol ?? product.title.replace(/\$/g, "").split(" ")[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div className="space-y-4">
        <div className="checkerboard aspect-square overflow-hidden rounded-2xl border border-[var(--border)]">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt={product.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-white/30">no preview</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1, 5).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="checkerboard aspect-square rounded-lg border border-[var(--border)] object-contain"
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-white/40">
          {product.blankType} · {product.design.mode.toLowerCase()}
        </div>
        <h1 className="text-3xl font-black">{product.title}</h1>
        <div className="mt-2 text-2xl text-[var(--accent-2)]">
          {formatPrice(product.priceCents)}
        </div>
        <p className="mt-4 text-sm text-white/60">
          Printed on demand and shipped worldwide. Ships in 2–7 business days.
        </p>

        <div className="mt-8">
          <AddToCart
            title={product.title}
            blankType={product.blankType}
            mode={product.design.mode}
            query={query}
            previewUrl={images[0] ?? ""}
            priceCents={product.priceCents}
            sizes={sizes}
          />
        </div>

        <p className="mt-6 text-xs text-white/30">
          Fan-made design, not affiliated with or endorsed by the referenced project.
        </p>
      </div>
    </div>
  );
}
