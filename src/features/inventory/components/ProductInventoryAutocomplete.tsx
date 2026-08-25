import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, Check, ChevronDown, Barcode } from 'lucide-react';
import { Product } from '../../../domain/catalog/Product';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { formatQuantity } from '../../../domain/common/quantity/Quantity';

export interface ProductSelectionOption {
  product: Product;
  currentStock: number; // Scaled units
  baseUnit: Product['baseUnit'];
  categoryName?: string | null;
}

interface ProductInventoryAutocompleteProps {
  selectedProduct: Product | null;
  onSelectProduct: (option: ProductSelectionOption | null) => void;
  disabled?: boolean;
}

export const ProductInventoryAutocomplete: React.FC<ProductInventoryAutocompleteProps> = ({
  selectedProduct,
  onSelectProduct,
  disabled = false,
}) => {
  const businessId = 'primary-business';
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<ProductSelectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const queryRepo = repositoryFactory.getInventoryQueryRepository();
      const result = await queryRepo.listStockTable({
        businessId,
        query,
        limit: 30,
      });

      const mapped: ProductSelectionOption[] = result.rows.map((r) => ({
        product: r.product,
        currentStock: r.currentStock,
        baseUnit: r.product.baseUnit,
        categoryName: r.categoryName,
      }));

      setOptions(mapped);
    } catch (err) {
      console.error('Error searching products for inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProducts(searchQuery);
    }
  }, [isOpen, searchQuery, loadProducts]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: ProductSelectionOption) => {
    onSelectProduct(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
        Producto <span className="text-status-danger">*</span>
      </label>

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm transition-colors outline-none cursor-pointer ${
          disabled
            ? 'opacity-60 cursor-not-allowed text-text-tertiary'
            : isOpen
            ? 'border-brand-primary ring-2 ring-brand-primary/20 text-text-primary'
            : 'hover:bg-surface-tertiary text-text-primary'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Package size={14} />
          </div>
          {selectedProduct ? (
            <div className="text-left truncate">
              <span className="font-semibold text-text-primary block truncate">
                {selectedProduct.name}
              </span>
              <span className="text-xs text-text-tertiary block truncate font-mono">
                {selectedProduct.sku ? `SKU: ${selectedProduct.sku}` : selectedProduct.barcode ? `EAN: ${selectedProduct.barcode}` : 'Sin código'}
              </span>
            </div>
          ) : (
            <span className="text-text-tertiary text-sm">Buscar o escanear producto...</span>
          )}
        </div>
        {!disabled && (
          <ChevronDown
            size={16}
            className={`text-text-tertiary transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-brand-primary' : ''
            }`}
          />
        )}
      </button>

      {/* Popover list */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface border border-border-default rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search bar inside popover */}
          <div className="p-2.5 border-b border-border-default bg-surface-secondary/40 flex items-center gap-2">
            <Search size={14} className="text-text-tertiary shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU o código de barras..."
              className="w-full bg-transparent border-none text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {loading ? (
              <div className="py-6 text-center text-xs text-text-tertiary">
                Buscando productos...
              </div>
            ) : options.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-tertiary">
                No se encontraron productos coincidentes.
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = selectedProduct?.id === opt.product.id;
                return (
                  <button
                    key={opt.product.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-primary/10 text-brand-primary font-medium'
                        : 'text-text-primary hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold truncate">{opt.product.name}</div>
                      <div className="text-[11px] text-text-tertiary flex items-center gap-2 mt-0.5">
                        {opt.product.sku && <span>SKU: {opt.product.sku}</span>}
                        {opt.product.barcode && (
                          <span className="flex items-center gap-0.5">
                            <Barcode size={10} /> {opt.product.barcode}
                          </span>
                        )}
                        {opt.categoryName && (
                          <span className="text-text-secondary">• {opt.categoryName}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-text-secondary">
                        Stock: {formatQuantity(opt.currentStock, opt.baseUnit)}
                      </div>
                    </div>

                    {isSelected && <Check size={14} className="text-brand-primary ml-2 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
