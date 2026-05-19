"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { money } from "@/features/pos/format";
import type { PosProduct } from "@/features/pos/types";
import { cn } from "@/lib/utils";

function ProductImage({ product }: { product: PosProduct }) {
  const [failed, setFailed] = useState(false);

  if (!product.imageUrl || failed) {
    return (
      <div className="flex size-full items-center justify-center bg-accent text-accent-foreground/55">
        <Package className="size-7" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}

export function ProductGrid({
  products,
  onAdd,
}: {
  products: PosProduct[];
  onAdd: (product: PosProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <div className="mb-3 flex size-[60px] items-center justify-center rounded-lg bg-card text-muted-foreground shadow-[0_12px_28px_hsl(220_20%_10%/0.06)]">
          <Package className="size-6 opacity-80" />
        </div>
        <p className="text-[15px] font-semibold">No hay productos</p>
        <p className="mt-1 text-sm text-muted-foreground">Crea productos o ajusta la busqueda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product) => {
        const lowStock = product.stock <= product.lowStockAlert;
        const outOfStock = product.stock <= 0;

        return (
          <button
            key={product.id}
            type="button"
            disabled={outOfStock}
            onClick={() => onAdd(product)}
            className={cn(
              "group touch-manipulation overflow-hidden rounded-lg border bg-card text-left shadow-[0_2px_8px_hsl(220_20%_10%/0.045)] transition will-change-transform",
              "hover:border-primary/35 hover:shadow-[0_8px_20px_hsl(220_20%_10%/0.07)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <div className="relative aspect-[1.03/1] overflow-hidden bg-muted sm:aspect-[1.08/1]">
              <ProductImage product={product} />
              <div className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-lg bg-background/92 text-primary opacity-0 shadow-[0_6px_16px_hsl(220_20%_10%/0.12)] backdrop-blur transition group-hover:opacity-100">
                <Plus className="size-4" />
              </div>
            </div>

            <div className="p-2 pt-2 sm:p-2.5 sm:pt-2">
              <p className="line-clamp-2 min-h-[32px] text-[13px] font-semibold leading-4 tracking-normal text-foreground sm:min-h-[34px] sm:text-[14px] sm:leading-[17px]">
                {product.name}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <p className="text-[15px] font-semibold leading-none text-primary sm:text-[16px]">
                  {money(product.priceUsd, "USD")}
                </p>
                <p className="shrink-0 text-[11px] font-medium leading-none text-muted-foreground">
                  {product.stock} uds
                </p>
              </div>
              {lowStock ? (
                <span className="mt-2 inline-flex rounded-md bg-destructive/9 px-1.5 py-1 text-[10px] font-semibold leading-none text-destructive">
                  Bajo stock
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
