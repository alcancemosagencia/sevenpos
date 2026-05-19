"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { Download, FileSpreadsheet, MoreVertical, Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppEmptyState } from "@/components/shared/app-states";
import { AppToast } from "@/components/shared/app-toast";
import { ImageUploader } from "@/components/shared/image-uploader";
import { PremiumModal } from "@/components/shared/premium-modal";
import { money } from "@/features/pos/format";
import type { PosProduct, ProductCategory } from "@/features/pos/types";
import {
  createProductAction,
  toggleProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/features/products/actions";

const emptyState: ProductActionState = {};
const units = [
  { value: "UNIT", label: "Unidad" },
  { value: "KG", label: "Kilogramo" },
  { value: "GR", label: "Gramo" },
  { value: "LT", label: "Litro" },
  { value: "ML", label: "Mililitro" },
  { value: "MT", label: "Metro" },
];

function ProductFields({
  product,
  categories,
}: {
  product?: PosProduct;
  categories: ProductCategory[];
}) {
  return (
    <>
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs" htmlFor={product ? `name-${product.id}` : "name"}>Nombre</Label>
          <Input className="h-10" id={product ? `name-${product.id}` : "name"} name="name" defaultValue={product?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Precio USD</Label>
          <Input className="h-10" name="priceUsd" type="number" min="0.01" step="0.01" defaultValue={product?.priceUsd ?? ""} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Precio Bs</Label>
          <Input className="h-10" name="priceBs" type="number" min="0" step="0.01" defaultValue={product?.priceBs ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Stock</Label>
          <Input className="h-10" name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 0} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Alerta bajo stock</Label>
          <Input className="h-10" name="lowStockAlert" type="number" min="0" step="1" defaultValue={product?.lowStockAlert ?? 5} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SKU</Label>
          <Input className="h-10" name="sku" defaultValue={product?.sku ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Barcode</Label>
          <Input className="h-10" name="barcode" defaultValue={product?.barcode ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unidad de venta</Label>
          <select
            name="unit"
            defaultValue={product?.unit ?? "UNIT"}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-semibold"
          >
            {units.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/35 p-3 sm:col-span-2">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>Mostrar en tienda online</span>
            <input type="hidden" name="isPublic" value="off" />
            <input type="checkbox" name="isPublic" defaultChecked={product?.isPublic ?? true} className="size-4 accent-primary" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>Vender por peso o medida</span>
            <input type="checkbox" name="soldByWeight" defaultChecked={product?.soldByWeight ?? false} className="size-4 accent-primary" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>Permitir monto variable</span>
            <input type="checkbox" name="allowVariablePrice" defaultChecked={product?.allowVariablePrice ?? false} className="size-4 accent-primary" />
          </label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">categoría</Label>
          <Input className="h-10" name="category" list="category-options" defaultValue={product?.categoryName ?? ""} />
          <datalist id="category-options">
            {categories.map((category) => (
              <option key={category.id} value={category.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <ImageUploader
            name="imageUrl"
            label="Imagen producto"
            kind="product"
            value={product?.imageUrl ?? ""}
            previewClassName="min-h-44"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Descripción</Label>
          <Input className="h-10" name="description" defaultValue={product?.description ?? ""} />
        </div>
        {product ? (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4 accent-primary" />
            Producto activo
          </label>
        ) : null}
      </div>
    </>
  );
}

function CreateProductForm({ categories, onDone }: { categories: ProductCategory[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(createProductAction, emptyState);
  useEffect(() => {
    if (state.ok) onDone();
  }, [onDone, state.ok]);

  return (
    <form action={action} className="space-y-3 p-4">
        <ProductFields categories={categories} />
        {state.error ? <p className="text-sm font-semibold text-destructive">{state.error}</p> : null}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending} className="flex-1 shadow-[0_12px_30px_hsl(218_92%_35%/0.22)]">
            {pending ? "Guardando..." : "Crear producto"}
          </Button>
        </div>
    </form>
  );
}

function ProductEditor({
  product,
  categories,
  onDone,
}: {
  product: PosProduct;
  categories: ProductCategory[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateProductAction, emptyState);
  useEffect(() => {
    if (state.ok) onDone();
  }, [onDone, state.ok]);

  return (
    <form action={action} className="space-y-3 p-4">
      <ProductFields product={product} categories={categories} />
      {state.error ? <p className="text-sm font-semibold text-destructive">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button disabled={pending} className="flex-1">
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function ProductRow({
  product,
  onEdit,
}: {
  product: PosProduct;
  onEdit: (product: PosProduct) => void;
}) {
  const lowStock = product.stock <= product.lowStockAlert;

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_35px_hsl(220_20%_10%/0.08)]">
      <div className="flex items-center gap-3 p-3">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
          ) : (
            <Package className="size-5" />
          )}
        </div>
        <button type="button" onClick={() => onEdit(product)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold leading-5">{product.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-primary">{money(product.priceUsd, "USD")}</span>
            <span>{product.stock} uds</span>
            <span>{product.categoryName ?? "Sin categoría"}</span>
          </div>
        </button>
        {lowStock ? <span className="rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">Bajo</span> : null}
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Opciones de producto"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </Card>
  );
}

export function ProductManager({
  products,
  categories,
}: {
  products: PosProduct[];
  categories: ProductCategory[];
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function closeWithSuccess() {
    setCreating(false);
    setEditingProduct(null);
    setToast("Producto guardado");
    window.setTimeout(() => setToast(null), 2200);
  }

  function downloadTemplate() {
    const csv = "name,priceUsd,priceBs,stock,lowStockAlert,sku,barcode,category,imageUrl,description,isPublic,soldByWeight,allowVariablePrice,unit\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sevenpos-productos-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.barcode, product.categoryName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [products, search]);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Productos</h1>
          <p className="text-sm text-muted-foreground">{products.length} productos</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="h-10 px-3" onClick={downloadTemplate}>
            <Download className="size-4" />
            Plantilla
          </Button>
          <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => setImporting(true)}>
            <FileSpreadsheet className="size-4" />
            Importar Excel
          </Button>
          <Button onClick={() => setCreating(true)} className="h-10 px-4 shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>
      {toast ? (
        <AppToast message={toast} tone="success" />
      ) : null}

      <div className="sticky top-0 z-10 bg-background/85 py-2 backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, Código..."
            className="h-11 bg-card pl-10 shadow-sm"
          />
        </div>
      </div>

        <div className="space-y-2">
          {filteredProducts.map((product) => (
          <ProductRow key={product.id} product={product} onEdit={setEditingProduct} />
          ))}
        </div>

        {filteredProducts.length === 0 ? (
        <AppEmptyState title="No hay productos" description="Crea productos o ajusta la búsqueda." />
        ) : null}

      <PremiumModal open={creating} title="Nuevo producto" description="Disponible al instante en POS." onClose={() => setCreating(false)}>
        <CreateProductForm categories={categories} onDone={closeWithSuccess} />
      </PremiumModal>

      <PremiumModal open={importing} title="Importar productos" description="Preview y validacion antes de guardar." onClose={() => setImporting(false)}>
        <div className="space-y-3 p-4">
          <label className="block rounded-lg border border-dashed bg-muted/35 p-4 text-center text-sm font-medium">
            <FileSpreadsheet className="mx-auto mb-2 size-6 text-primary" />
            Seleccionar Excel o CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={(event) => setImportFileName(event.target.files?.[0]?.name ?? "")}
            />
          </label>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Columnas requeridas</p>
            <p className="mt-1 text-sm text-muted-foreground">name, priceUsd, stock. SKU y barcode se validaran como unicos antes de importar.</p>
          </div>
          {importFileName ? (
            <div className="rounded-lg border bg-primary/5 p-3 text-sm">
              <p className="font-semibold text-primary">{importFileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">Preview preparado. La escritura masiva queda pendiente para conectar parser XLSX con validacion transaccional.</p>
            </div>
          ) : null}
          <Button type="button" disabled={!importFileName} className="h-11 w-full" onClick={() => setToast("Preview listo para validar")}>
            Validar importacion
          </Button>
        </div>
      </PremiumModal>

      <PremiumModal
        open={Boolean(editingProduct)}
        title="Editar producto"
        description={editingProduct?.name}
        onClose={() => setEditingProduct(null)}
      >
        {editingProduct ? (
          <>
            <ProductEditor product={editingProduct} categories={categories} onDone={closeWithSuccess} />
            <form action={toggleProductAction} className="border-t p-4">
              <input type="hidden" name="productId" value={editingProduct.id} />
              <input type="hidden" name="isActive" value={editingProduct.isActive ? "false" : "true"} />
              <Button variant="secondary" className="h-10 w-full">
                {editingProduct.isActive ? "Pausar producto" : "Activar producto"}
              </Button>
            </form>
          </>
        ) : null}
      </PremiumModal>
    </section>
  );
}
