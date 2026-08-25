import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Layers,
  Power,
  Package,
  Barcode,
  Tag,
  Scale,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { GetProduct } from '../application/catalog/product/GetProduct';
import { DeactivateProduct } from '../application/catalog/product/DeactivateProduct';
import { CreatePresentation } from '../application/catalog/presentation/CreatePresentation';
import { UpdatePresentation } from '../application/catalog/presentation/UpdatePresentation';
import { DeactivatePresentation } from '../application/catalog/presentation/DeactivatePresentation';
import { ProductDetailWithPresentations } from '../domain/catalog/ProductRepository';
import { ProductPresentation } from '../domain/catalog/ProductPresentation';
import { formatMoney } from '../domain/common/money/Money';
import { getBaseUnitDefinition } from '../domain/common/unit/BaseUnit';
import { CurrencyCode } from '../types/country';
import { PresentationModal } from '../features/catalog/components/PresentationModal';
import { ProductImage } from '../components/ui/ProductImage';
import { PageContainer } from '../components/shell/PageContainer';
import { Button } from '../components/ui/Button';

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onEditProduct: (id: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onBack,
  onEditProduct,
}) => {
  const { state } = useAuth();
  const businessId = 'primary-business';
  const currency = (state.regionalSettings.primaryCurrencyCode as CurrencyCode) || 'CLP';

  const productRepo = repositoryFactory.getProductRepository();
  const presentationRepo = repositoryFactory.getProductPresentationRepository();
  const identifierRepo = repositoryFactory.getCatalogIdentifierRepository();

  const [detail, setDetail] = useState<ProductDetailWithPresentations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Presentation modal state
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<ProductPresentation | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const getProductUseCase = new GetProduct(productRepo);

    async function loadData() {
      try {
        const res = await getProductUseCase.execute(productId, businessId);
        if (isMounted) {
          if (!res) {
            setErrorMessage('El producto no fue encontrado.');
          } else {
            setDetail(res);
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Error al cargar la información del producto.');
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [productId, businessId, refreshTrigger, productRepo]);

  const handleToggleProductStatus = async () => {
    if (!detail) return;
    try {
      const deactivateProductUseCase = new DeactivateProduct(productRepo);
      if (detail.product.active) {
        await deactivateProductUseCase.execute(detail.product.id, businessId);
        showToast('Producto desactivado');
      } else {
        await productRepo.activate(detail.product.id, businessId);
        showToast('Producto activado');
      }
      setRefreshTrigger((r) => r + 1);
    } catch {
      showToast('Error al actualizar estado del producto');
    }
  };

  const handleTogglePresentationStatus = async (presId: string, currentActive: boolean) => {
    try {
      const deactivatePresentationUseCase = new DeactivatePresentation(presentationRepo);
      if (currentActive) {
        await deactivatePresentationUseCase.execute(presId, businessId);
        showToast('Presentación desactivada');
      } else {
        await presentationRepo.activate(presId, businessId);
        showToast('Presentación activada');
      }
      setRefreshTrigger((r) => r + 1);
    } catch {
      showToast('Error al actualizar estado');
    }
  };

  const handleSavePresentation = async (data: {
    name: string;
    description?: string | null;
    unitFactor: number;
    salePrice: number;
    sku?: string | null;
    barcode?: string | null;
  }) => {
    if (selectedPresentation) {
      const updatePresentationUseCase = new UpdatePresentation(presentationRepo, identifierRepo);
      const res = await updatePresentationUseCase.execute({
        id: selectedPresentation.id,
        businessId,
        ...data,
      });
      if (res.success) {
        showToast('Presentación actualizada con éxito');
        setRefreshTrigger((r) => r + 1);
      }
      return res;
    } else {
      const createPresentationUseCase = new CreatePresentation(presentationRepo, productRepo, identifierRepo);
      const res = await createPresentationUseCase.execute({
        businessId,
        productId,
        ...data,
      });
      if (res.success) {
        showToast('Presentación agregada con éxito');
        setRefreshTrigger((r) => r + 1);
      }
      return res;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <div className="h-10 w-48 bg-surface-secondary rounded-xl animate-pulse" />
        <div className="h-64 w-full bg-surface-primary rounded-2xl border border-border-default animate-pulse" />
      </div>
    );
  }

  if (errorMessage || !detail) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle size={36} className="text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-text-primary">{errorMessage || 'Producto no encontrado'}</h2>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary rounded-xl text-xs font-semibold text-text-primary"
        >
          Volver a productos
        </button>
      </div>
    );
  }

  const { product, category, presentations } = detail;
  const unitDef = getBaseUnitDefinition(product.baseUnit);

  return (
    <PageContainer maxWidth="narrow">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 bg-surface-primary border border-brand-primary text-text-primary text-xs font-semibold rounded-xl shadow-xl animate-in slide-in-from-top-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Presentation Modal */}
      <PresentationModal
        isOpen={showPresentationModal}
        onClose={() => {
          setShowPresentationModal(false);
          setSelectedPresentation(null);
        }}
        onSave={handleSavePresentation}
        initialPresentation={selectedPresentation}
        baseProductName={product.name}
        baseProductPrice={product.salePrice}
        baseUnitLabel={unitDef.label}
        currency={currency}
      />

      {/* Detail Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border-default">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft size={16} />
          <span>Volver al catálogo</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={handleToggleProductStatus}
            leftIcon={<Power size={14} className={product.active ? 'text-status-warning' : 'text-status-success'} />}
            className="w-full sm:w-auto text-xs sm:text-sm font-semibold"
          >
            {product.active ? 'Desactivar' : 'Activar producto'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onEditProduct(product.id)}
            leftIcon={<Pencil size={14} />}
            className="w-full sm:w-auto text-xs sm:text-sm font-semibold"
          >
            Editar producto
          </Button>
        </div>
      </div>

      {/* Product Summary Header Card */}
      <div className="p-5 sm:p-6 bg-surface border border-border-default rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Thumbnail */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-secondary border border-border-default flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            <ProductImage src={product.imagePath} alt={product.name} fallbackIconSize={36} />
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {category ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary border border-border-default text-text-primary">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || '#3b82f6' }} />
                  <span>{category.name}</span>
                </span>
              ) : (
                <span className="text-xs text-text-tertiary italic">Sin categoría</span>
              )}

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  product.active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-surface-secondary text-text-tertiary border border-border-default'
                }`}
              >
                {product.active ? 'Activo para venta' : 'Inactivo'}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{product.name}</h1>

            {product.description && (
              <p className="text-sm text-text-secondary leading-relaxed">{product.description}</p>
            )}

            {/* Quick badges */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-text-secondary font-medium">
              <div className="flex items-center gap-1.5">
                <Scale size={14} className="text-text-tertiary" />
                <span>Unidad base: <strong className="text-text-primary">{unitDef.label}</strong></span>
              </div>
              {product.sku && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Tag size={14} className="text-text-tertiary" />
                  <span>SKU: <strong className="text-text-primary">{product.sku}</strong></span>
                </div>
              )}
              {product.barcode && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Barcode size={14} className="text-text-tertiary" />
                  <span>Código: <strong className="text-text-primary">{product.barcode}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-xl bg-surface-secondary border border-border-default text-right shrink-0 w-full sm:w-auto">
            <p className="text-xs text-text-tertiary uppercase font-semibold">Precio de venta</p>
            <p className="text-2xl font-extrabold text-emerald-400 tabular-nums mt-0.5">
              {formatMoney(product.salePrice, currency)}
            </p>
            {product.costPrice !== null && product.costPrice !== undefined && (
              <p className="text-xs text-text-tertiary mt-1">
                Costo ref.: {formatMoney(product.costPrice, currency)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Presentations Section (First-Class Citizen) */}
      <div className="p-5 sm:p-6 bg-surface-primary border border-border-default rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-brand-primary" />
              <h2 className="text-base font-bold text-text-primary">Presentaciones de venta</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-secondary text-text-secondary">
                {presentations.length}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Packs, cajas o formatos especiales que consumen inventario de la unidad base.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPresentation(null);
              setShowPresentationModal(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>Agregar presentación</span>
          </button>
        </div>

        {/* Base Unit Reminder Row */}
        <div className="p-3.5 rounded-xl bg-surface-secondary/50 border border-border-default flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-primary border border-border-default flex items-center justify-center text-text-tertiary">
              <Package size={14} />
            </div>
            <div>
              <span className="font-semibold text-text-primary">Unidad individual (Base)</span>
              <span className="text-text-tertiary ml-2">Factor: 1 {unitDef.shortLabel}</span>
            </div>
          </div>
          <div className="font-bold text-text-primary">
            {formatMoney(product.salePrice, currency)}
          </div>
        </div>

        {/* Presentation Items List */}
        {presentations.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-border-default rounded-xl p-4">
            <p className="text-xs text-text-secondary font-medium">
              Este producto solo se vende por unidad individual.
            </p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Agrega presentaciones para vender en formato Pack x6, Caja x24, etc.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {presentations.map((pres) => (
              <div
                key={pres.id}
                className="p-4 rounded-xl bg-surface-secondary border border-border-default hover:border-brand-primary transition-all space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-text-primary text-sm">{pres.name}</h3>
                    <p className="text-xs text-emerald-400 font-medium">
                      Equivale a {pres.unitFactor} {unitDef.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-text-primary text-base tabular-nums">
                      {formatMoney(pres.salePrice, currency)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-tertiary pt-1">
                  {pres.sku && <span>SKU: {pres.sku}</span>}
                  {pres.barcode && <span>Código: {pres.barcode}</span>}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      pres.active
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-surface-primary text-text-tertiary'
                    }`}
                  >
                    {pres.active ? 'Activa' : 'Inactiva'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPresentation(pres);
                        setShowPresentationModal(true);
                      }}
                      className="p-1 text-text-secondary hover:text-text-primary rounded"
                      title="Editar presentación"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePresentationStatus(pres.id, pres.active)}
                      className={`p-1 rounded ${
                        pres.active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={pres.active ? 'Desactivar presentación' : 'Activar presentación'}
                    >
                      <Power size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
