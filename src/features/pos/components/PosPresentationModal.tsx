import React from 'react';
import { Product } from '../../../domain/catalog/Product';
import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { Button } from '../../../components/ui/Button';
import { X, Package, Layers } from 'lucide-react';

interface PosPresentationModalProps {
  isOpen: boolean;
  product: Product | null;
  presentations: ProductPresentation[];
  stockScaled: number;
  onClose: () => void;
  onSelectBaseProduct: (product: Product) => void;
  onSelectPresentation: (product: Product, presentation: ProductPresentation) => void;
}

export const PosPresentationModal: React.FC<PosPresentationModalProps> = ({
  isOpen,
  product,
  presentations,
  onClose,
  onSelectBaseProduct,
  onSelectPresentation,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm dark:bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">{product.name}</h2>
              <p className="text-xs text-text-secondary">Selecciona la presentación a vender</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Presentation Options */}
        <div className="p-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto">
          {/* Base Unit Option */}
          <button
            type="button"
            onClick={() => {
              onSelectBaseProduct(product);
              onClose();
            }}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border-default bg-surface hover:border-brand-primary/60 hover:bg-surface-hover transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-border-default flex items-center justify-center text-text-tertiary group-hover:text-brand-primary transition-colors">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                  Unidad base ({product.baseUnit})
                </p>
                <p className="text-xs text-text-tertiary">Factor x1</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-text-primary">
                ${product.salePrice.toLocaleString('es-ES')}
              </span>
            </div>
          </button>

          {/* Presentations List */}
          {presentations.map((pres) => (
            <button
              key={pres.id}
              type="button"
              onClick={() => {
                onSelectPresentation(product, pres);
                onClose();
              }}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border-default bg-surface hover:border-brand-primary/60 hover:bg-surface-hover transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                    {pres.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Factor x{pres.unitFactor} {product.baseUnit.toLowerCase()}
                    {pres.sku ? ` · SKU: ${pres.sku}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-text-primary">
                  ${pres.salePrice.toLocaleString('es-ES')}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-border-default bg-surface-secondary/20">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
