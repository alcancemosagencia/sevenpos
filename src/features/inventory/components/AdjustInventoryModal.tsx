import React, { useState, useEffect } from 'react';
import { X, ArrowDownUp, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Product } from '../../../domain/catalog/Product';
import { ProductInventoryAutocomplete, ProductSelectionOption } from './ProductInventoryAutocomplete';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { RecordMovement } from '../../../application/inventory/RecordMovement';
import { formatQuantity, parseQuantityInput, toMajorQuantity } from '../../../domain/common/quantity/Quantity';
import { getBaseUnitDefinition } from '../../../domain/common/unit/BaseUnit';
import { ReasonCode } from '../../../domain/inventory/InventoryMovement';

interface AdjustInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: Product | null;
  initialStock?: number;
}

const REASON_OPTIONS = [
  { value: 'PHYSICAL_COUNT', label: 'Conteo físico periódico' },
  { value: 'DATA_CORRECTION', label: 'Corrección de error de digitación' },
  { value: 'OTHER', label: 'Otro motivo de ajuste' },
];

export const AdjustInventoryModal: React.FC<AdjustInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct = null,
  initialStock = 0,
}) => {
  const businessId = 'primary-business';
  const userId = 'primary-user';

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [currentStock, setCurrentStock] = useState<number>(initialStock);
  const [countedInput, setCountedInput] = useState<string>('');
  const [reasonCode, setReasonCode] = useState<ReasonCode>('PHYSICAL_COUNT');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProduct(initialProduct);
      setCurrentStock(initialStock);
      setCountedInput(initialStock > 0 ? toMajorQuantity(initialStock).toString() : '0');
      setReasonCode('PHYSICAL_COUNT');
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialProduct, initialStock]);

  if (!isOpen) return null;

  const baseUnitCode = selectedProduct?.baseUnit || 'UNIT';
  const unitDef = getBaseUnitDefinition(baseUnitCode);

  const handleProductSelect = (option: ProductSelectionOption | null) => {
    if (option) {
      setSelectedProduct(option.product);
      setCurrentStock(option.currentStock);
      setCountedInput(option.currentStock > 0 ? toMajorQuantity(option.currentStock).toString() : '0');
    } else {
      setSelectedProduct(null);
      setCurrentStock(0);
      setCountedInput('');
    }
    setError(null);
  };

  const parsedCounted = parseQuantityInput(countedInput, baseUnitCode);
  const diffScaled = parsedCounted !== null ? parsedCounted - currentStock : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setError('Debes seleccionar un producto.');
      return;
    }

    if (parsedCounted === null || parsedCounted < 0) {
      setError(`Ingresa una cantidad contada válida (${unitDef.allowDecimals ? 'admite decimales' : 'solo enteros'}).`);
      return;
    }

    if (diffScaled === null || diffScaled === 0) {
      setError('El stock contado es idéntico al actual (diferencia 0). No se requiere ajuste.');
      return;
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
        movementType: diffScaled > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantityDelta: diffScaled,
        reasonCode,
        note: notes.trim() ? notes.trim() : `Ajuste por conteo físico: ${toMajorQuantity(currentStock)} -> ${toMajorQuantity(parsedCounted)} ${unitDef.shortLabel}`,
        createdByUserId: userId,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar el ajuste de inventario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <ArrowDownUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">Ajustar inventario</h3>
              <p className="text-xs text-text-tertiary">
                Reconcilia el stock del sistema con el conteo físico real
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

          {/* Comparison Cards: Current vs Counted vs Difference */}
          {selectedProduct && (
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-surface-secondary/40 border border-border-default">
              {/* Current Stock */}
              <div className="text-center p-2.5 rounded-xl bg-surface border border-border-default">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">
                  Stock actual
                </div>
                <div className="text-sm font-mono font-bold text-text-secondary">
                  {formatQuantity(currentStock, baseUnitCode)}
                </div>
              </div>

              {/* Counted Physical */}
              <div className="text-center p-2.5 rounded-xl bg-surface border border-brand-primary/40 ring-1 ring-brand-primary/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
                  Contado
                </div>
                <div className="text-sm font-mono font-bold text-brand-primary">
                  {parsedCounted !== null ? formatQuantity(parsedCounted, baseUnitCode) : '—'}
                </div>
              </div>

              {/* Difference */}
              <div className={`text-center p-2.5 rounded-xl border ${
                diffScaled === null || diffScaled === 0
                  ? 'bg-surface border-border-default text-text-tertiary'
                  : diffScaled > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  {diffScaled && diffScaled > 0 ? (
                    <TrendingUp size={12} />
                  ) : diffScaled && diffScaled < 0 ? (
                    <TrendingDown size={12} />
                  ) : (
                    <Minus size={12} />
                  )}
                  Diferencia
                </div>
                <div className="text-sm font-mono font-bold">
                  {diffScaled !== null
                    ? `${diffScaled > 0 ? '+' : ''}${formatQuantity(diffScaled, baseUnitCode)}`
                    : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Counted input */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Nuevo stock contado en físico <span className="text-status-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={countedInput}
                onChange={(e) => {
                  setCountedInput(e.target.value);
                  setError(null);
                }}
                placeholder={unitDef.allowDecimals ? 'Ej. 15.5' : 'Ej. 15'}
                className="w-full px-3 py-2 pr-12 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-tertiary pointer-events-none">
                {unitDef.shortLabel}
              </span>
            </div>
            <p className="text-[10px] text-text-tertiary mt-1">
              Ingresa la cantidad física que tienes disponible actualmente. El sistema calculará el ajuste automáticamente.
            </p>
          </div>

          {/* Reason Code */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Motivo del ajuste <span className="text-status-danger">*</span>
            </label>
            <Select
              value={reasonCode}
              onChange={(val) => setReasonCode(val as ReasonCode)}
              options={REASON_OPTIONS}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Nota / Justificación <span className="text-text-tertiary font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Conteo de fin de mes - Auditoría de estantería"
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={submitting}>
              Aplicar ajuste
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
