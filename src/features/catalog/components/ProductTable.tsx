import React, { useState } from 'react';
import { MoreVertical, Edit2, Eye, Layers, Power } from 'lucide-react';
import { ProductListItem } from '../../../domain/catalog/ProductRepository';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { getBaseUnitDefinition } from '../../../domain/common/unit/BaseUnit';
import { ProductImage } from '../../../components/ui/ProductImage';

interface ProductTableProps {
  items: ProductListItem[];
  currency: CurrencyCode;
  onViewDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onManagePresentations: (id: string) => void;
  onToggleStatus: (id: string, currentActive: boolean) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  items,
  currency,
  onViewDetail,
  onEdit,
  onManagePresentations,
  onToggleStatus,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-secondary/60 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <th className="py-3 px-4">Producto</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">SKU / Código</th>
              <th className="py-3 px-4 text-right">Precio de venta</th>
              <th className="py-3 px-4 text-center">Presentaciones</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {items.map(({ product, category, presentationCount }) => {
              const unitDef = getBaseUnitDefinition(product.baseUnit);
              const isMenuOpen = openMenuId === product.id;

              return (
                <tr
                  key={product.id}
                  className="hover:bg-surface-secondary/40 transition-colors group cursor-pointer"
                  onClick={() => onViewDetail(product.id)}
                >
                  {/* Product details */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-border-default flex items-center justify-center overflow-hidden shrink-0">
                        <ProductImage
                          src={product.imagePath}
                          alt={product.name}
                          fallbackIconSize={18}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary group-hover:text-brand-primary transition-colors line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Unidad base: <span className="font-medium text-text-secondary">{unitDef.label}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    {category ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary border border-border-default text-text-primary">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category.color || '#3b82f6' }}
                        />
                        <span>{category.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary italic">Sin categoría</span>
                    )}
                  </td>

                  {/* SKU / Barcode */}
                  <td className="py-3 px-4 font-mono text-xs text-text-secondary">
                    {product.sku || product.barcode ? (
                      <div className="space-y-0.5">
                        {product.sku && <div className="text-text-primary font-medium">{product.sku}</div>}
                        {product.barcode && <div className="text-[11px] text-text-tertiary">{product.barcode}</div>}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 text-right font-bold text-text-primary tabular-nums">
                    {formatMoney(product.salePrice, currency)}
                  </td>

                  {/* Presentations */}
                  <td className="py-3 px-4 text-center">
                    {presentationCount > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManagePresentations(product.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                        title="Ver presentaciones del producto"
                      >
                        <Layers size={12} />
                        <span>{presentationCount} {presentationCount === 1 ? 'pres.' : 'pres.'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-surface-secondary text-text-tertiary border border-border-default'
                      }`}
                    >
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Actions Dropdown */}
                  <td className="py-3 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(isMenuOpen ? null : product.id)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                        title="Opciones de producto"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-44 rounded-xl bg-surface-primary border border-border-default shadow-xl z-30 py-1 divide-y divide-border-default focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onViewDetail(product.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-secondary flex items-center gap-2 cursor-pointer"
                              >
                                <Eye size={14} className="text-text-secondary" />
                                <span>Ver detalle</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEdit(product.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-secondary flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 size={14} className="text-text-secondary" />
                                <span>Editar producto</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onManagePresentations(product.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-secondary flex items-center gap-2 cursor-pointer"
                              >
                                <Layers size={14} className="text-text-secondary" />
                                <span>Presentaciones</span>
                              </button>
                            </div>
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onToggleStatus(product.id, product.active);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer ${
                                  product.active
                                    ? 'text-amber-400 hover:bg-amber-500/10'
                                    : 'text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                              >
                                <Power size={14} />
                                <span>{product.active ? 'Desactivar' : 'Activar producto'}</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
