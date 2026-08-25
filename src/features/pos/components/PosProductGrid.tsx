import React from 'react';
import { Product } from '../../../domain/catalog/Product';
import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { Category } from '../../../domain/catalog/Category';
import { PosProductCard } from './PosProductCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Select, SelectOption } from '../../../components/ui/Select';
import { Search, Package, PackageX, Plus } from 'lucide-react';

interface PosProductGridProps {
  products: Product[];
  presentations: ProductPresentation[];
  categories: Category[];
  stockMap: Map<string, number>;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategoryId: string | null;
  selectedFilterType: 'ALL' | 'FEATURED' | 'CATEGORY';
  onSelectAllCategories: () => void;
  onSelectFeatured: () => void;
  onSelectCategory: (catId: string) => void;
  onSelectProduct: (product: Product) => void;
  onSelectPresentationRequest: (product: Product, presentations: ProductPresentation[]) => void;
  onNavigateToCatalog: () => void;
  onNavigateToInventory: () => void;
}

export const PosProductGrid: React.FC<PosProductGridProps> = ({
  products,
  presentations,
  categories,
  stockMap,
  searchQuery,
  onSearchChange,
  selectedCategoryId,
  selectedFilterType,
  onSelectAllCategories,
  onSelectFeatured,
  onSelectCategory,
  onSelectProduct,
  onSelectPresentationRequest,
  onNavigateToCatalog,
  onNavigateToInventory,
}) => {
  // Category select options
  const categorySelectOptions: SelectOption[] = React.useMemo(() => {
    const opts: SelectOption[] = [
      { value: 'ALL', label: 'Todas las categorías' },
    ];
    if (products.some((p) => p.featured)) {
      opts.push({ value: 'FEATURED', label: '⭐ Destacados' });
    }
    for (const cat of categories) {
      opts.push({
        value: `CAT_${cat.id}`,
        label: cat.name,
        color: cat.color,
      });
    }
    return opts;
  }, [products, categories]);

  const currentSelectValue = React.useMemo(() => {
    if (selectedFilterType === 'FEATURED') return 'FEATURED';
    if (selectedFilterType === 'CATEGORY' && selectedCategoryId) return `CAT_${selectedCategoryId}`;
    return 'ALL';
  }, [selectedFilterType, selectedCategoryId]);

  const handleCategorySelectChange = (val: string) => {
    if (val === 'ALL') {
      onSelectAllCategories();
    } else if (val === 'FEATURED') {
      onSelectFeatured();
    } else if (val.startsWith('CAT_')) {
      onSelectCategory(val.replace('CAT_', ''));
    }
  };

  // Filter products by category, featured, and search query
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Category / Featured filter
      if (selectedFilterType === 'FEATURED' && !p.featured) return false;
      if (selectedFilterType === 'CATEGORY' && p.categoryId !== selectedCategoryId) return false;

      // Search query filter (matches product name, SKU, barcode, or presentation SKU/barcode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);

        const prodPresentations = presentations.filter((pres) => pres.productId === p.id);
        const matchPres = prodPresentations.some(
          (pres) => pres.name.toLowerCase().includes(q) || pres.sku?.toLowerCase().includes(q) || pres.barcode?.toLowerCase().includes(q)
        );

        return matchName || matchSku || matchBarcode || matchPres;
      }

      return true;
    });
  }, [products, presentations, selectedFilterType, selectedCategoryId, searchQuery]);

  // Group presentations by product
  const presentationMap = React.useMemo(() => {
    const map = new Map<string, ProductPresentation[]>();
    for (const pres of presentations) {
      const existing = map.get(pres.productId) || [];
      existing.push(pres);
      map.set(pres.productId, existing);
    }
    return map;
  }, [presentations]);

  const hasAnyProducts = products.length > 0;
  const hasProductsWithStock = products.some((p) => (stockMap.get(p.id) || 0) > 0);

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4">
      {/* Top Search & Filter Toolbar (Clean workspace layout without outer card) */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Search Bar (flex: 1) */}
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar producto, SKU o código de barras (F2 / Escáner)..."
            className="w-full pl-10 pr-16 py-2.5 bg-surface border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary text-xs px-2 py-0.5 rounded-md hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Category Select (Compact width) */}
        <div className="w-full sm:w-60 md:w-72 shrink-0">
          <Select
            options={categorySelectOptions}
            value={currentSelectValue}
            onChange={handleCategorySelectChange}
            className="w-full shadow-xs"
          />
        </div>
      </div>

      {/* Grid Content / Empty States */}
      <div className="flex-1 overflow-y-auto pr-1">
        {!hasAnyProducts ? (
          <EmptyState
            icon={<Package size={24} />}
            title="Aún no tienes productos para vender"
            description="Crea productos en tu catálogo para comenzar a registrar ventas en el punto de venta."
            action={
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={onNavigateToCatalog}>
                Ir a Catálogo
              </Button>
            }
          />
        ) : !hasProductsWithStock ? (
          <EmptyState
            icon={<PackageX size={24} />}
            title="No hay productos con existencias disponibles"
            description="Todos tus productos tienen inventario en cero. Registra una entrada o ajuste de existencias para poder vender."
            action={
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={onNavigateToInventory}>
                Agregar inventario
              </Button>
            }
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Search size={24} />}
            title="No se encontraron productos"
            description="No hay productos que coincidan con la búsqueda o categoría seleccionada."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  onSearchChange('');
                  onSelectAllCategories();
                }}
              >
                Restablecer filtros
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredProducts.map((prod) => (
              <PosProductCard
                key={prod.id}
                product={prod}
                presentations={presentationMap.get(prod.id) || []}
                stockScaled={stockMap.get(prod.id) || 0}
                onSelectProduct={onSelectProduct}
                onSelectPresentationRequest={onSelectPresentationRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
