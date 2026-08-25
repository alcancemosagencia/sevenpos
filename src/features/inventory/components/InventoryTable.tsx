import React, { useState } from 'react';
import {
  Package,
  MoreVertical,
  Plus,
  ArrowDownUp,
  Trash2,
  Eye,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { InventoryProductRow } from '../../../domain/inventory/repositories/InventoryQueryRepository';
import { formatQuantity } from '../../../domain/common/quantity/Quantity';
import { useCountry } from '../../../context/CountryContext';

interface InventoryTableProps {
  rows: InventoryProductRow[];
  loading: boolean;
  onAddStock: (row: InventoryProductRow) => void;
  onAdjustStock: (row: InventoryProductRow) => void;
  onWasteStock: (row: InventoryProductRow) => void;
  onViewDetail: (row: InventoryProductRow) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  rows,
  loading,
  onAddStock,
  onAdjustStock,
  onWasteStock,
  onViewDetail,
}) => {
  const { formatMoney } = useCountry();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getStatusBadge = (status: InventoryProductRow['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Disponible
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle size={11} /> Stock bajo
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            Sin stock
          </span>
        );
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="py-16 text-center text-text-tertiary text-sm flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        <span>Cargando existencias de inventario...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Administrative Table (HeroUI styling matching CategoriesPage) */}
      <div className="hidden md:block bg-surface border border-border-default rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default/80 bg-surface-secondary/50 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Stock actual</th>
                <th className="py-3 px-4 text-right">Stock mínimo</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Costo promedio</th>
                <th className="py-3 px-4 text-center">Último movimiento</th>
                <th className="py-3 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50">
              {rows.map((row) => {
                const prod = row.product;
                const isMenuOpen = activeMenuId === prod.id;

                return (
                  <tr
                    key={prod.id}
                    className="hover:bg-surface-hover/70 transition-colors group cursor-pointer"
                    onClick={() => onViewDetail(row)}
                  >
                    {/* Product cell with icon thumbnail */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center text-text-secondary shrink-0 border border-border-default group-hover:border-brand-primary/40 transition-colors">
                          <Package size={16} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-text-primary block truncate group-hover:text-brand-primary transition-colors">
                            {prod.name}
                          </span>
                          <div className="text-xs text-text-tertiary font-mono flex items-center gap-2 mt-0.5">
                            {prod.sku && <span>SKU: {prod.sku}</span>}
                            {prod.barcode && <span>EAN: {prod.barcode}</span>}
                            {row.lotCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-text-secondary font-sans font-medium">
                                <Layers size={11} className="text-text-tertiary" /> {row.lotCount} {row.lotCount === 1 ? 'lote' : 'lotes'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {row.categoryName ? (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: row.categoryColor || '#10b981' }}
                          />
                          <span className="truncate max-w-[130px] font-medium">{row.categoryName}</span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary italic text-xs">Sin categoría</span>
                      )}
                    </td>

                    {/* Current Stock */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-text-primary">
                        {formatQuantity(row.currentStock, prod.baseUnit)}
                      </span>
                    </td>

                    {/* Minimum Stock */}
                    <td className="py-3.5 px-4 text-right text-text-secondary font-mono">
                      {row.minimumStock !== null && row.minimumStock !== undefined
                        ? formatQuantity(row.minimumStock, prod.baseUnit)
                        : '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(row.status)}</td>

                    {/* Cost */}
                    <td className="py-3.5 px-4 text-right">
                      {row.estimatedCost ? (
                        <div>
                          <div className="font-mono font-semibold text-text-primary">
                            {formatMoney(row.estimatedCost)}
                          </div>
                          <div className="text-[10px] text-text-tertiary font-medium">
                            {row.costQuality === 'REAL' ? 'Promedio' : 'Referencial'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-tertiary font-mono">—</span>
                      )}
                    </td>

                    {/* Last movement date */}
                    <td className="py-3.5 px-4 text-center text-text-secondary font-mono text-xs">
                      {row.lastMovementAt
                        ? new Date(row.lastMovementAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : 'Sin mov.'}
                    </td>

                    {/* Actions Dropdown */}
                    <td
                      className="py-3.5 px-5 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuOpen ? null : prod.id)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                        title="Acciones"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-5 top-11 z-30 w-52 rounded-xl bg-surface border border-border-default shadow-xl p-1.5 text-left animate-in fade-in-0 zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onAddStock(row);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                          >
                            <Plus size={14} className="text-emerald-500" />
                            <span>Agregar inventario</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onAdjustStock(row);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                          >
                            <ArrowDownUp size={14} className="text-brand-primary" />
                            <span>Ajustar inventario</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onWasteStock(row);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Registrar merma</span>
                          </button>

                          <div className="my-1 border-t border-border-default" />

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onViewDetail(row);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>Ver detalle e historial</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards List (<768px) */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const prod = row.product;

          return (
            <div
              key={prod.id}
              onClick={() => onViewDetail(row)}
              className="p-4 rounded-xl bg-surface border border-border-default shadow-sm space-y-3 cursor-pointer active:bg-surface-secondary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-surface-secondary flex items-center justify-center text-text-secondary shrink-0 border border-border-default">
                    <Package size={18} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-text-primary truncate">{prod.name}</h3>
                    <p className="text-xs text-text-tertiary font-mono truncate">
                      {prod.sku ? `SKU: ${prod.sku}` : prod.barcode ? `EAN: ${prod.barcode}` : 'Sin código'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">{getStatusBadge(row.status)}</div>
              </div>

              {/* Stock numbers row */}
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border-default">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                    Stock actual
                  </span>
                  <span className="text-base font-mono font-bold text-text-primary">
                    {formatQuantity(row.currentStock, prod.baseUnit)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                    Costo promedio
                  </span>
                  <span className="text-sm font-mono font-semibold text-text-secondary">
                    {row.estimatedCost ? formatMoney(row.estimatedCost) : '—'}
                  </span>
                </div>
              </div>

              {/* Action buttons bar for Mobile */}
              <div
                className="pt-2.5 border-t border-border-default flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onAddStock(row)}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-default text-xs font-semibold text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} className="text-emerald-500" />
                  <span>Entrada</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAdjustStock(row)}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-default text-xs font-semibold text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowDownUp size={13} className="text-brand-primary" />
                  <span>Ajustar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onWasteStock(row)}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Merma</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
