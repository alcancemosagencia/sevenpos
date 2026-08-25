import React from 'react';
import { PackagePlus, SearchX, Plus, RotateCcw } from 'lucide-react';

interface ProductEmptyStateProps {
  type: 'firstUse' | 'searchEmpty';
  onAddProduct?: () => void;
  onClearFilters?: () => void;
}

export const ProductEmptyState: React.FC<ProductEmptyStateProps> = ({
  type,
  onAddProduct,
  onClearFilters,
}) => {
  if (type === 'firstUse') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface-primary border border-border-default rounded-2xl shadow-sm my-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-4 shadow-sm">
          <PackagePlus size={32} />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Agrega tu primer producto</h3>
        <p className="text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
          Crea productos, organiza categorías y prepáralos para vender desde SevenPOS.
        </p>
        {onAddProduct && (
          <button
            type="button"
            onClick={onAddProduct}
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={16} />
            <span>Crear producto</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-surface-primary border border-border-default rounded-2xl shadow-sm my-4">
      <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-border-default flex items-center justify-center text-text-tertiary mb-3">
        <SearchX size={28} />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">No encontramos productos</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-5">
        Prueba ajustando el término de búsqueda o restableciendo los filtros seleccionados.
      </p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary border border-border-default text-text-primary text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>Limpiar filtros</span>
        </button>
      )}
    </div>
  );
};
