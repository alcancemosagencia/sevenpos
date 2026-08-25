import React from 'react';
import { Product } from '../../../domain/catalog/Product';
import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { formatQuantity } from '../../../domain/common/quantity/Quantity';
import { ProductImage } from '../../../components/ui/ProductImage';
import { Layers } from 'lucide-react';

interface PosProductCardProps {
  product: Product;
  presentations: ProductPresentation[];
  stockScaled: number;
  onSelectProduct: (product: Product) => void;
  onSelectPresentationRequest: (product: Product, presentations: ProductPresentation[]) => void;
}

export const PosProductCard: React.FC<PosProductCardProps> = ({
  product,
  presentations,
  stockScaled,
  onSelectProduct,
  onSelectPresentationRequest,
}) => {
  const isOutOfStock = stockScaled <= 0;
  const isLowStock = !isOutOfStock && product.minimumStock != null && stockScaled <= product.minimumStock;
  const hasPresentations = presentations.length > 0;

  const handleClick = () => {
    if (isOutOfStock) return;
    if (hasPresentations) {
      onSelectPresentationRequest(product, presentations);
    } else {
      onSelectProduct(product);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-150 select-none text-left ${
        isOutOfStock
          ? 'bg-surface/50 border-border-default/50 opacity-60 cursor-not-allowed'
          : 'bg-surface border-border-default hover:border-brand-primary/60 hover:shadow-md cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Product Image / Icon Area */}
      <div className="relative w-full aspect-square rounded-xl bg-surface-secondary/70 border border-border-default/50 flex items-center justify-center overflow-hidden mb-2.5">
        <ProductImage src={product.imagePath} alt={product.name} fallbackIconSize={32} />

        {/* Presentation Indicator Badge */}
        {hasPresentations && (
          <div
            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-xs border border-border-default/60 text-[10px] font-bold text-text-secondary flex items-center gap-1 shadow-xs"
            title={`${presentations.length} presentaciones disponibles`}
          >
            <Layers size={10} />
            <span>+{presentations.length}</span>
          </div>
        )}

        {/* Stock Status Badge Overlay */}
        <div className="absolute bottom-1.5 left-1.5">
          {isOutOfStock ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-status-danger/10 text-status-danger border border-status-danger/20 backdrop-blur-xs">
              Sin stock
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-status-warning/10 text-status-warning border border-status-warning/20 backdrop-blur-xs">
              {formatQuantity(stockScaled, product.baseUnit)}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-background/80 text-text-secondary border border-border-default/60 backdrop-blur-xs">
              {formatQuantity(stockScaled, product.baseUnit)}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 justify-between gap-1">
        <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors">
          {product.name}
        </h3>

        <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-border-default/40">
          <span className="text-sm font-bold text-text-primary tracking-tight">
            ${product.salePrice.toLocaleString('es-ES')}
          </span>
          <span className="text-[10px] text-text-tertiary uppercase font-mono">
            {product.baseUnit}
          </span>
        </div>
      </div>
    </div>
  );
};
