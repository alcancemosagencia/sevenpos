import React from 'react';
import { Edit2, Eye, Layers, Power } from 'lucide-react';
import { ProductListItem } from '../../../domain/catalog/ProductRepository';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { getBaseUnitDefinition } from '../../../domain/common/unit/BaseUnit';
import { ProductImage } from '../../../components/ui/ProductImage';

interface ProductCardListProps {
  items: ProductListItem[];
  currency: CurrencyCode;
  onViewDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onManagePresentations: (id: string) => void;
  onToggleStatus: (id: string, currentActive: boolean) => void;
}

export const ProductCardList: React.FC<ProductCardListProps> = ({
  items,
  currency,
  onViewDetail,
  onEdit,
  onManagePresentations,
  onToggleStatus,
}) => {
  return (
    <div className="space-y-3">
      {items.map(({ product, category, presentationCount }) => {
        const unitDef = getBaseUnitDefinition(product.baseUnit);

        return (
          <div
            key={product.id}
            onClick={() => onViewDetail(product.id)}
            className="p-3.5 bg-surface border border-border-default rounded-xl shadow-sm space-y-3 cursor-pointer hover:border-brand-primary transition-all active:scale-[0.99]"
          >
            {/* Top row: Thumbnail + Title + Price */}
            <div className="flex items-start gap-3 justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-surface-secondary border border-border-default flex items-center justify-center overflow-hidden shrink-0">
                  <ProductImage
                    src={product.imagePath}
                    alt={product.name}
                    fallbackIconSize={22}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-text-primary text-sm truncate">{product.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {category ? (
                      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: category.color || '#3b82f6' }}
                        />
                        <span className="truncate">{category.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary italic">Sin categoría</span>
                    )}
                    <span className="text-text-tertiary text-xs">•</span>
                    <span className="text-xs text-text-tertiary">{unitDef.label}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-text-primary text-base tabular-nums">
                  {formatMoney(product.salePrice, currency)}
                </span>
              </div>
            </div>

            {/* Middle row: Identifiers & badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              {product.sku && (
                <span className="px-2 py-0.5 rounded bg-surface-secondary text-text-secondary font-mono text-[11px]">
                  SKU: {product.sku}
                </span>
              )}
              {product.barcode && (
                <span className="px-2 py-0.5 rounded bg-surface-secondary text-text-secondary font-mono text-[11px]">
                  {product.barcode}
                </span>
              )}
              {presentationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                  <Layers size={10} />
                  <span>{presentationCount} pres.</span>
                </span>
              )}
              <span
                className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  product.active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-surface-secondary text-text-tertiary'
                }`}
              >
                {product.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {/* Bottom row: Quick action buttons */}
            <div
              className="flex items-center gap-2 pt-2 border-t border-border-default/60"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onViewDetail(product.id)}
                className="flex-1 py-1.5 px-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg text-xs font-medium text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye size={13} />
                <span>Ver</span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(product.id)}
                className="flex-1 py-1.5 px-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg text-xs font-medium text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => onManagePresentations(product.id)}
                className="py-1.5 px-2.5 bg-surface-secondary hover:bg-surface-tertiary rounded-lg text-xs font-medium text-text-secondary flex items-center justify-center transition-colors cursor-pointer"
                title="Presentaciones"
              >
                <Layers size={13} />
              </button>
              <button
                type="button"
                onClick={() => onToggleStatus(product.id, product.active)}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                  product.active
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
                title={product.active ? 'Desactivar' : 'Activar'}
              >
                <Power size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
