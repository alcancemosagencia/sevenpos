import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Layers, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Product } from '../../../domain/catalog/Product';
import { ProductInventoryAutocomplete, ProductSelectionOption } from './ProductInventoryAutocomplete';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { RecordMovement } from '../../../application/inventory/RecordMovement';
import { useCountry } from '../../../context/CountryContext';
import { formatQuantity, parseQuantityInput } from '../../../domain/common/quantity/Quantity';
import { getBaseUnitDefinition } from '../../../domain/common/unit/BaseUnit';
import { parseMoneyInput, toMajorUnits } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: Product | null;
  initialStock?: number;
  mode?: 'ENTRY' | 'OPENING';
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct = null,
  initialStock = 0,
  mode = 'ENTRY',
}) => {
  const businessId = 'primary-business';
  const userId = 'primary-user';
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [currentStock, setCurrentStock] = useState<number>(initialStock);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [unitCostInput, setUnitCostInput] = useState<string>('');
  const [showLotSection, setShowLotSection] = useState(false);
  const [lotCode, setLotCode] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProduct(initialProduct);
      setCurrentStock(initialStock);
      setQuantityInput('');
      setUnitCostInput(initialProduct?.costPrice !== null && initialProduct?.costPrice !== undefined ? String(toMajorUnits(initialProduct.costPrice, currency)) : '');
      setShowLotSection(false);
      setLotCode('');
      setExpirationDate('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialProduct, initialStock, currency]);

  if (!isOpen) return null;

  const baseUnitCode = selectedProduct?.baseUnit || 'UNIT';
  const unitDef = getBaseUnitDefinition(baseUnitCode);

  const handleProductSelect = (option: ProductSelectionOption | null) => {
    if (option) {
      setSelectedProduct(option.product);
      setCurrentStock(option.currentStock);
      if (option.product.costPrice !== null && option.product.costPrice !== undefined) {
        setUnitCostInput(String(toMajorUnits(option.product.costPrice, currency)));
      }
    } else {
      setSelectedProduct(null);
      setCurrentStock(0);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setError('Debes seleccionar un producto.');
      return;
    }

    const scaledQty = parseQuantityInput(quantityInput, baseUnitCode);
    if (!scaledQty || scaledQty <= 0) {
      setError(`Ingresa una cantidad válida (${unitDef.allowDecimals ? 'admite decimales' : 'solo números enteros'}).`);
      return;
    }

    let parsedUnitCost: number | null = null;
    if (unitCostInput && unitCostInput.trim().length > 0) {
      parsedUnitCost = parseMoneyInput(unitCostInput, currency);
      if (parsedUnitCost === null || parsedUnitCost < 0) {
        setError('El costo unitario ingresado no es válido.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const movementRepo = repositoryFactory.getInventoryMovementRepository();
      const lotRepo = repositoryFactory.getInventoryLotRepository();
      const productRepo = repositoryFactory.getProductRepository();

      const recordMovement = new RecordMovement(movementRepo, lotRepo, productRepo);

      await recordMovement.execute({
        businessId,
        productId: selectedProduct.id,
        movementType: mode === 'OPENING' || currentStock === 0 ? 'OPENING' : 'ENTRY',
        quantityDelta: scaledQty,
        unitCost: parsedUnitCost,
        lotCode: showLotSection && lotCode.trim() ? lotCode.trim() : null,
        expirationDate: showLotSection && expirationDate ? expirationDate : null,
        note: notes.trim() ? notes.trim() : null,
        createdByUserId: userId,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la entrada de inventario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">
                {mode === 'OPENING' ? 'Registrar inventario inicial' : 'Agregar inventario'}
              </h3>
              <p className="text-xs text-text-tertiary">
                {mode === 'OPENING' ? 'Apertura inicial de existencias para este producto' : 'Registra una entrada manual o compra de mercadería'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[calc(85vh-4rem)] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-start gap-2.5 text-xs text-status-danger">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Product selector */}
          <ProductInventoryAutocomplete
            selectedProduct={selectedProduct}
            onSelectProduct={handleProductSelect}
            disabled={Boolean(initialProduct)}
          />

          {/* Current Stock Banner */}
          {selectedProduct && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary/40 border border-border-default">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-brand-primary" />
                <span className="text-xs text-text-secondary">Stock actual registrado:</span>
              </div>
              <span className="text-xs font-mono font-bold text-text-primary">
                {formatQuantity(currentStock, baseUnitCode)}
              </span>
            </div>
          )}

          {/* Quantity & Unit Cost grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Cantidad a ingresar <span className="text-status-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={quantityInput}
                  onChange={(e) => {
                    setQuantityInput(e.target.value);
                    setError(null);
                  }}
                  placeholder={unitDef.allowDecimals ? 'Ej. 1.250' : 'Ej. 20'}
                  className="w-full px-3 py-2 pr-12 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-tertiary pointer-events-none">
                  {unitDef.shortLabel}
                </span>
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">
                Unidad: {unitDef.label} {unitDef.allowDecimals ? '(admite decimales)' : '(enteros)'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Costo unitario ({country.primaryCurrency.code}) <span className="text-text-tertiary font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={unitCostInput}
                onChange={(e) => setUnitCostInput(e.target.value)}
                placeholder="Ej. 1200"
                className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors"
              />
              <p className="text-[10px] text-text-tertiary mt-1">
                Costo de compra para cálculo de costo promedio
              </p>
            </div>
          </div>

          {/* Lot & Expiration Section Toggle */}
          <div className="pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={() => setShowLotSection(!showLotSection)}
              className="flex items-center justify-between w-full text-xs font-semibold text-text-secondary hover:text-brand-primary transition-colors py-1 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-brand-primary" />
                <span>Información de lote y vencimiento (Opcional)</span>
              </div>
              <span className="text-brand-primary font-bold text-xs">
                {showLotSection ? 'Ocultar' : '+ Agregar lote'}
              </span>
            </button>

            {showLotSection && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-surface-secondary/30 border border-border-default space-y-3 animate-in fade-in-0 duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Código de lote
                    </label>
                    <input
                      type="text"
                      value={lotCode}
                      onChange={(e) => setLotCode(e.target.value.toUpperCase())}
                      placeholder="Ej. L-0826"
                      className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-xs font-mono focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-text-tertiary" /> Fecha de vencimiento
                    </label>
                    <DatePicker
                      value={expirationDate}
                      onChange={setExpirationDate}
                      placeholder="Seleccionar fecha"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-text-tertiary">
                  El lote se vinculará a esta entrada permitiendo control de fechas de caducidad.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Nota / Observaciones <span className="text-text-tertiary font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Factura #4021 - Distribuidora Los Andes"
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={submitting}>
              {mode === 'OPENING' ? 'Registrar inventario inicial' : 'Registrar entrada'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
