import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Barcode,
  Info,
  AlertCircle,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { productImageStorage } from '../infrastructure/storage/ProductImageStorage';
import { CreateProduct } from '../application/catalog/product/CreateProduct';
import { UpdateProduct } from '../application/catalog/product/UpdateProduct';
import { GetProduct } from '../application/catalog/product/GetProduct';
import { ListCategories } from '../application/catalog/category/ListCategories';
import { CreateCategory } from '../application/catalog/category/CreateCategory';
import { Category } from '../domain/catalog/Category';
import { BaseUnitCode } from '../domain/common/unit/BaseUnit';
import { CurrencyCode } from '../types/country';
import { CreateCategoryModal } from '../features/catalog/components/CreateCategoryModal';
import { UnsavedChangesDialog } from '../features/catalog/components/UnsavedChangesDialog';
import { CategoryAutocomplete } from '../features/catalog/components/CategoryAutocomplete';
import { BaseUnitSelect } from '../features/catalog/components/BaseUnitSelect';
import { MoneyInput } from '../components/ui/MoneyInput';
import { Button } from '../components/ui/Button';

interface ProductFormPageProps {
  productId?: string | null; // If null, mode is Create; otherwise Edit
  onBack: () => void;
  onSuccess: (savedProductId: string) => void;
}

export const ProductFormPage: React.FC<ProductFormPageProps> = ({
  productId,
  onBack,
  onSuccess,
}) => {
  const { state } = useAuth();
  const businessId = 'primary-business';
  const currency = (state.regionalSettings.primaryCurrencyCode as CurrencyCode) || 'CLP';

  const isEditMode = Boolean(productId);

  const productRepo = repositoryFactory.getProductRepository();
  const categoryRepo = repositoryFactory.getCategoryRepository();
  const identifierRepo = repositoryFactory.getCatalogIdentifierRepository();

  const createProductUseCase = new CreateProduct(productRepo, identifierRepo);
  const updateProductUseCase = new UpdateProduct(productRepo, identifierRepo);
  const createCategoryUseCase = new CreateCategory(categoryRepo);

  // Form Fields State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [baseUnit, setBaseUnit] = useState<BaseUnitCode>('UNIT');
  const [salePriceMinor, setSalePriceMinor] = useState<number | null>(null);
  const [costPriceMinor, setCostPriceMinor] = useState<number | null>(null);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [minimumStock, setMinimumStock] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [savedImagePath, setSavedImagePath] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Categories list
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Request state
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    const getProductUseCase = new GetProduct(productRepo);
    const listCategoriesUseCase = new ListCategories(categoryRepo);

    async function init() {
      try {
        const catList = await listCategoriesUseCase.execute(businessId, true);
        if (isMounted) {
          setCategories(catList);
        }

        if (productId) {
          const detail = await getProductUseCase.execute(productId, businessId);
          if (detail && isMounted) {
            const p = detail.product;
            setName(p.name);
            setDescription(p.description || '');
            setCategoryId(p.categoryId || '');
            setBaseUnit(p.baseUnit);
            setSalePriceMinor(p.salePrice);
            setCostPriceMinor(p.costPrice ?? null);
            setSku(p.sku || '');
            setBarcode(p.barcode || '');
            setMinimumStock(p.minimumStock !== null && p.minimumStock !== undefined ? String(p.minimumStock) : '');
            setSavedImagePath(p.imagePath || null);

            if (p.imagePath) {
              const url = await productImageStorage.resolveImageUrl(p.imagePath);
              if (isMounted) {
                setImagePreviewUrl(url);
              }
            }
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Error al cargar datos del producto.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [productId, businessId, currency, productRepo, categoryRepo]);

  const processImageFile = (file: File) => {
    setImageError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError('Formato no soportado. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('La imagen es demasiado pesada (máx 10MB).');
      return;
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setSavedImagePath(null);
    setImageError(null);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Inline Category Creation
  const handleInlineSaveCategory = async (catData: { name: string; description?: string | null; color?: string | null }) => {
    const res = await createCategoryUseCase.execute({
      businessId,
      ...catData,
    });
    if (res.success && res.category) {
      const listCategoriesUseCase = new ListCategories(categoryRepo);
      const updatedList = await listCategoriesUseCase.execute(businessId, true);
      setCategories(updatedList);
      setCategoryId(res.category.id);
      setIsDirty(true);
    }
    return res;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }

    if (salePriceMinor === null || salePriceMinor < 0) {
      setErrorMessage('El precio de venta debe ser un número válido igual o mayor a cero.');
      return;
    }

    let parsedMinStock: number | null = null;
    if (minimumStock.trim()) {
      parsedMinStock = parseInt(minimumStock, 10);
      if (isNaN(parsedMinStock) || parsedMinStock < 0) {
        setErrorMessage('El stock mínimo debe ser un número entero mayor o igual a cero.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalImagePath = savedImagePath;

      // If user uploaded a new image file, save via ProductImageStorage adapter
      const tempId = productId || crypto.randomUUID();
      if (imageFile) {
        try {
          const imgResult = await productImageStorage.saveProductImage(tempId, imageFile);
          finalImagePath = imgResult.imagePath;
        } catch (imgErr) {
          // Non-blocking: warning only
          console.warn('Could not optimize image', imgErr);
        }
      }

      if (isEditMode && productId) {
        const updateResult = await updateProductUseCase.execute({
          id: productId,
          businessId,
          name: name.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          baseUnit,
          salePrice: salePriceMinor,
          costPrice: costPriceMinor,
          minimumStock: parsedMinStock,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          imagePath: finalImagePath,
        });

        if (!updateResult.success) {
          setErrorMessage(updateResult.error || 'Error al actualizar producto.');
          setIsSubmitting(false);
          return;
        }

        setIsDirty(false);
        onSuccess(productId);
      } else {
        const createResult = await createProductUseCase.execute({
          businessId,
          name: name.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          baseUnit,
          salePrice: salePriceMinor,
          costPrice: costPriceMinor,
          minimumStock: parsedMinStock,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          imagePath: finalImagePath,
        });

        if (!createResult.success || !createResult.product) {
          setErrorMessage(createResult.error || 'Error al crear producto.');
          setIsSubmitting(false);
          return;
        }

        setIsDirty(false);
        onSuccess(createResult.product.id);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado al guardar el producto.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackAttempt = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-8 max-w-4xl mx-auto">
        <div className="h-10 w-48 bg-surface-secondary rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-surface rounded-2xl border border-border-default animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-5">
      {/* Unsaved changes confirmation */}
      <UnsavedChangesDialog
        isOpen={showUnsavedModal}
        onStay={() => setShowUnsavedModal(false)}
        onLeave={() => {
          setShowUnsavedModal(false);
          onBack();
        }}
      />

      {/* Inline category modal */}
      <CreateCategoryModal
        isOpen={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSave={handleInlineSaveCategory}
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-border-default">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackAttempt}
            className="p-2 rounded-xl bg-surface-secondary border border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            title="Volver a la lista de productos"
            aria-label="Volver a la lista de productos"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-text-primary tracking-tight truncate">
              {isEditMode ? 'Editar producto' : 'Nuevo producto'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5 leading-relaxed">
              {isEditMode
                ? 'Actualiza los datos del producto y su configuración de venta.'
                : 'Ingresa los datos del producto para comenzar a venderlo.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <Button
            variant="secondary"
            size="md"
            onClick={handleBackAttempt}
            className="flex-1 sm:flex-initial justify-center"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Save size={16} />}
            className="flex-1 sm:flex-initial justify-center font-semibold"
          >
            <span>Guardar producto</span>
          </Button>
        </div>
      </div>

      {/* Form Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm flex items-center gap-2.5">
          <AlertCircle size={20} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloque 1: Información General */}
        <div className="p-5 sm:p-6 bg-surface border border-border-default rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-default/60 pb-2">
            1. Información general
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Image Upload Column with Drag & Drop */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Imagen del producto
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full aspect-square max-w-[200px] mx-auto md:mx-0 rounded-2xl border-2 border-dashed ${
                  isDragOver
                    ? 'border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/20 scale-[1.02]'
                    : 'border-border-default hover:border-brand-primary bg-surface-secondary/40'
                } flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all relative overflow-hidden group`}
              >
                {imagePreviewUrl ? (
                  <>
                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                      title="Eliminar imagen"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : isDragOver ? (
                  <div className="flex flex-col items-center justify-center animate-in zoom-in-95">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center mb-2 shadow-md">
                      <UploadCloud size={22} className="animate-bounce" />
                    </div>
                    <p className="text-xs font-bold text-brand-primary">Suelta la imagen aquí</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-surface-secondary text-text-tertiary group-hover:text-brand-primary flex items-center justify-center mb-2 transition-colors">
                      <UploadCloud size={22} />
                    </div>
                    <p className="text-xs font-semibold text-text-primary">Seleccionar foto</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">o arrastra una imagen aquí</p>
                    <p className="text-[9px] text-text-tertiary mt-0.5">PNG, JPG, WebP máx. 10MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              {imageError && (
                <p className="text-xs text-status-danger mt-1.5 text-center md:text-left">{imageError}</p>
              )}
            </div>

            {/* Name, Category, Description */}
            <div className="md:col-span-2 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Nombre del producto <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ej. Coca-Cola 350ml, Arroz Grano Largo 1kg..."
                  className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-medium focus:outline-none focus:border-brand-primary transition-colors"
                  maxLength={150}
                  required
                />
              </div>

              {/* Category selector with HeroUI Autocomplete and inline add */}
              <CategoryAutocomplete
                categories={categories}
                value={categoryId || null}
                onChange={(newCatId) => {
                  setCategoryId(newCatId || '');
                  setIsDirty(true);
                }}
                onCreateCategoryClick={() => setShowCreateCategoryModal(true)}
              />

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Descripción <span className="text-text-tertiary font-normal">(Opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Detalles adicionales, marca o especificaciones..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 2: Venta y Precios */}
        <div className="p-5 sm:p-6 bg-surface border border-border-default rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-default/60 pb-2">
            2. Venta y precios
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            {/* Sale Price with MoneyInput */}
            <MoneyInput
              label="Precio de venta"
              valueMinor={salePriceMinor}
              onChangeMinor={(minor) => {
                setSalePriceMinor(minor);
                setIsDirty(true);
              }}
              currency={currency}
              required
              placeholder="0"
            />

            {/* Reference Cost with MoneyInput */}
            <MoneyInput
              label="Costo de referencia (Opcional)"
              valueMinor={costPriceMinor}
              onChangeMinor={(minor) => {
                setCostPriceMinor(minor);
                setIsDirty(true);
              }}
              currency={currency}
              placeholder="0"
              helperText="Costo inicial estimado para inventario."
            />

            {/* Base Unit with HeroUI Select */}
            <BaseUnitSelect
              value={baseUnit}
              onChange={(newUnit) => {
                setBaseUnit(newUnit);
                setIsDirty(true);
              }}
            />
          </div>
        </div>

        {/* Bloque 3: Identificadores */}
        <div className="p-5 sm:p-6 bg-surface border border-border-default rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-default/60 pb-2">
            3. Identificadores y códigos
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Código SKU interno <span className="text-text-tertiary font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ej. BEB-COCA-350"
                className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors uppercase"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Código de barras <span className="text-text-tertiary font-normal">(EAN, UPC, interno)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ej. 7801234567890"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors"
                />
                <Barcode size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 4: Inventario (Referencia preliminar) */}
        <div className="p-5 sm:p-6 bg-surface border border-border-default rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-default/60 pb-2">
            4. Control de inventario
          </h2>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Stock mínimo de alerta <span className="text-text-tertiary font-normal">(Opcional)</span>
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={minimumStock}
              onChange={(e) => {
                setMinimumStock(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ej. 10"
              className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <div className="p-3 bg-surface-secondary/60 rounded-xl border border-border-default flex items-start gap-2.5 text-xs text-text-secondary">
            <Info size={16} className="text-brand-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              El stock mínimo es un umbral de alerta para cuando el módulo de <strong>Inventario</strong> esté activo. No afecta existencias ni movimientos en este paso.
            </p>
          </div>
        </div>

        {/* Form Bottom Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 w-full">
          <Button
            variant="secondary"
            size="md"
            onClick={handleBackAttempt}
            className="flex-1 sm:flex-initial justify-center"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Save size={16} />}
            className="flex-1 sm:flex-initial justify-center font-semibold"
          >
            <span>Guardar producto</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
