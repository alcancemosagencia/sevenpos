"use client";

import { useMemo, useState } from "react";
import { Archive, Download, FileSpreadsheet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumModal } from "@/components/shared/premium-modal";
import { adjustStockAction } from "@/features/backoffice/actions";

type InventoryProduct = {
  id: string;
  name: string;
  categoryName: string | null;
  stock: number;
  lowStockAlert: number;
};

export function InventoryClient({ products }: { products: InventoryProduct[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState("");

  const lowCount = products.filter((product) => product.stock <= product.lowStockAlert && product.stock > 0).length;
  const outCount = products.filter((product) => product.stock <= 0).length;
  const visible = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = product.name.toLowerCase().includes(query.trim().toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "low" && product.stock <= product.lowStockAlert && product.stock > 0) ||
        (filter === "out" && product.stock <= 0);
      return matchesQuery && matchesFilter;
    });
  }, [filter, products, query]);

  function downloadTemplate() {
    const csv = "sku,barcode,name,stock,reason\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sevenpos-inventario-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Inventario</h1>
          <p className="text-sm text-muted-foreground">{products.length} productos</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="h-10 px-3" onClick={downloadTemplate}>
            <Download className="size-4" />
            Plantilla
          </Button>
          <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => setImporting(true)}>
            <FileSpreadsheet className="size-4" />
            Importar
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["all", `Todos (${products.length})`],
          ["low", `Bajo stock (${lowCount})`],
          ["out", `Sin stock (${outCount})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as "all" | "low" | "out")}
            className={
              filter === key
                ? "shrink-0 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background"
                : "shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto..." className="h-11 bg-card pl-10" />
      </div>

      <div className="space-y-2">
        {visible.map((product) => {
          const out = product.stock <= 0;
          const low = product.stock <= product.lowStockAlert && !out;
          return (
            <Card key={product.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.categoryName ?? "Sin categoría"}</p>
              </div>
              <span className={out ? "rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive" : low ? "rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700" : "rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground"}>
                {product.stock} uds
              </span>
              <Button variant="outline" size="sm" onClick={() => setEditing(product)}>
                Ajustar
              </Button>
            </Card>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Card className="flex min-h-[150px] flex-col items-center justify-center p-6 text-center">
          <Archive className="mb-2 size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay productos para este filtro</p>
        </Card>
      ) : null}

      <PremiumModal open={Boolean(editing)} title="Ajustar stock" description={editing?.name} onClose={() => setEditing(null)}>
        {editing ? (
          <form action={adjustStockAction} className="space-y-3 p-4">
            <input type="hidden" name="productId" value={editing.id} />
            <div className="space-y-1.5">
              <Label className="text-xs">Stock actual</Label>
              <Input name="stock" type="number" min="0" step="1" defaultValue={editing.stock} className="h-10" />
            </div>
            <Button className="h-11 w-full">Guardar ajuste</Button>
          </form>
        ) : null}
      </PremiumModal>

      <PremiumModal open={importing} title="Importar inventario" description="Ajustes masivos con preview." onClose={() => setImporting(false)}>
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Validaciones</p>
            <p className="mt-1 text-sm text-muted-foreground">SKU/barcode existente, stock mayor o igual a cero y motivo de ajuste para historial.</p>
          </div>
          {importFileName ? <p className="rounded-lg bg-primary/5 p-3 text-sm font-semibold text-primary">{importFileName}</p> : null}
          <Button type="button" disabled={!importFileName} className="h-11 w-full">Previsualizar ajustes</Button>
        </div>
      </PremiumModal>
    </section>
  );
}
