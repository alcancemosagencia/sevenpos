import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, AlertCircle, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListProducts } from '../application/catalog/product/ListProducts';
import { DeactivateProduct } from '../application/catalog/product/DeactivateProduct';
import { ListCategories } from '../application/catalog/category/ListCategories';
import { ProductListItem, ProductKpiSummary } from '../domain/catalog/ProductRepository';
import { Category } from '../domain/catalog/Category';
import { ProductKpis } from '../features/catalog/components/ProductKpis';
import { ProductSearchFilters } from '../features/catalog/components/ProductSearchFilters';
import { ProductTable } from '../features/catalog/components/ProductTable';
import { ProductCardList } from '../features/catalog/components/ProductCardList';
import { ProductEmptyState } from '../features/catalog/components/ProductEmptyState';
import { ScannerCaptureListener } from '../features/catalog/components/ScannerCaptureListener';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';

import { CurrencyCode } from '../types/country';

interface ProductsListPageProps {
  onNavigateToNewProduct: () => void;
  onNavigateToEditProduct: (id: string) => void;
  onNavigateToProductDetail: (id: string) => void;
}

export const ProductsListPage: React.FC<ProductsListPageProps> = ({
  onNavigateToNewProduct,
  onNavigateToEditProduct,
  onNavigateToProductDetail,
}) => {
  const { state } = useAuth();
  const businessId = 'primary-business';
  const currency = (state.regionalSettings.primaryCurrencyCode as CurrencyCode) || 'CLP';

  const productRepo = repositoryFactory.getProductRepository();
  const categoryRepo = repositoryFactory.getCategoryRepository();

  // Filter and pagination states
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [hasPresentations, setHasPresentations] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isProImportModalOpen, setIsProImportModalOpen] = useState(false);

  // Data states
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kpis, setKpis] = useState<ProductKpiSummary>({
    activeProducts: 0,
    totalCategories: 0,
    uncategorizedProducts: 0,
    productsWithPresentations: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const listProductsUseCase = new ListProducts(productRepo);
    const listCategoriesUseCase = new ListCategories(categoryRepo);

    async function loadData() {
      try {
        const [productsResult, categoriesList, kpiData] = await Promise.all([
          listProductsUseCase.execute({
            businessId,
            query,
            categoryId: categoryId || undefined,
            status,
            hasPresentations,
            page,
            pageSize,
          }),
          listCategoriesUseCase.execute(businessId),
          listProductsUseCase.getKpis(businessId),
        ]);

        if (isMounted) {
          setItems(productsResult.items);
          setTotal(productsResult.total);
          setTotalPages(productsResult.totalPages);
          setCategories(categoriesList);
          setKpis(kpiData);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'No pudimos cargar los productos de la base de datos local.'
          );
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [businessId, query, categoryId, status, hasPresentations, page, pageSize, refreshTrigger, productRepo, categoryRepo]);

  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    try {
      const deactivateProductUseCase = new DeactivateProduct(productRepo);
      if (currentActive) {
        await deactivateProductUseCase.execute(id, businessId);
        showToast('Producto desactivado correctamente');
      } else {
        await productRepo.activate(id, businessId);
        showToast('Producto activado correctamente');
      }
      setRefreshTrigger((r) => r + 1);
    } catch {
      showToast('Error al cambiar el estado del producto');
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setQuery(scannedCode);
    showToast(`Buscando código de barras: ${scannedCode}`);
  };

  const handleResetFilters = () => {
    setQuery('');
    setCategoryId('');
    setStatus('all');
    setHasPresentations(undefined);
    setPage(1);
  };

  const hasAnyFilter = Boolean(query || categoryId || status !== 'all' || hasPresentations !== undefined);

  return (
    <PageContainer>
      <ScannerCaptureListener onScan={handleBarcodeScanned} />

      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 bg-surface border border-brand-primary text-text-primary text-xs font-semibold rounded-xl shadow-xl animate-in slide-in-from-top-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Productos"
        subtitle="Administra los productos que vendes en tu negocio."
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <IconButton
              variant="secondary"
              size="md"
              onClick={() => setRefreshTrigger((r) => r + 1)}
              disabled={isLoading}
              ariaLabel="Recargar catálogo"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </IconButton>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsProImportModalOpen(true)}
              leftIcon={<Sparkles size={16} className="text-brand-primary" />}
              className="w-full sm:w-auto"
            >
              Cargar Lista
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onNavigateToNewProduct}
              leftIcon={<Plus size={16} />}
              className="w-full sm:w-auto"
            >
              Nuevo producto
            </Button>
          </div>
        }
      />

      {/* Cargar Lista PRO Informative Modal */}
      {isProImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150"
          onClick={() => setIsProImportModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-text-primary text-base">Cargar Lista con IA</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary">Próximamente en SevenPOS Pro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProImportModalOpen(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Importa cientos de productos en segundos a partir de <strong>listas de precios PDF</strong>, <strong>planillas Excel (.xlsx/.csv)</strong> o <strong>fotos de facturas y catálogos</strong>. Nuestra IA extraerá automáticamente nombres, códigos de barras, precios y unidades para que los revises y apruebes antes de guardarlos.
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsProImportModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Real KPIs Summary */}
      <ProductKpis kpis={kpis} isLoading={isLoading} />

      {/* Search & Filters */}
      <ProductSearchFilters
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          setPage(1);
        }}
        categoryId={categoryId}
        onCategoryChange={(c) => {
          setCategoryId(c);
          setPage(1);
        }}
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        hasPresentations={hasPresentations}
        onHasPresentationsChange={(h) => {
          setHasPresentations(h);
          setPage(1);
        }}
        categories={categories}
        onResetFilters={handleResetFilters}
      />

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTrigger((r) => r + 1)}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2 py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full bg-surface-primary border border-border-default rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Content */}
      {!isLoading && !errorMessage && (
        <>
          {total === 0 ? (
            hasAnyFilter ? (
              <ProductEmptyState type="searchEmpty" onClearFilters={handleResetFilters} />
            ) : (
              <ProductEmptyState type="firstUse" onAddProduct={onNavigateToNewProduct} />
            )
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <ProductTable
                  items={items}
                  currency={currency}
                  onViewDetail={onNavigateToProductDetail}
                  onEdit={onNavigateToEditProduct}
                  onManagePresentations={onNavigateToProductDetail}
                  onToggleStatus={handleToggleStatus}
                />
              </div>

              {/* Mobile Card List View (390px / 375px) */}
              <div className="block md:hidden">
                <ProductCardList
                  items={items}
                  currency={currency}
                  onViewDetail={onNavigateToProductDetail}
                  onEdit={onNavigateToEditProduct}
                  onManagePresentations={onNavigateToProductDetail}
                  onToggleStatus={handleToggleStatus}
                />
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border-default text-xs text-text-secondary">
                  <p>
                    Mostrando <strong className="text-text-primary">{items.length}</strong> de <strong className="text-text-primary">{total}</strong> productos
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary border border-border-default rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Anterior
                    </button>
                    <span className="px-2 font-medium text-text-primary">
                      Página {page} de {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary border border-border-default rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
};
