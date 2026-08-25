import React, { useState, useEffect } from 'react';
import { X, Trash2, Package, AlertTriangle, AlertCircle, Layers } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Product } from '../../../domain/catalog/Product';
import { ProductInventoryAutocomplete, ProductSelectionOption } from './ProductInventoryAutocomplete';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { RecordMovement } from '../../../application/inventory/RecordMovement';
import { formatQuantity, parseQuantityInput } from '../../../domain/common/quantity/Quantity';
import { getBaseUnitDefinition } from '../../../domain/common/unit/BaseUnit';
import { ReasonCode } from '../../../domain/inventory/InventoryMovement';
import { InventoryLotWithStock } from '../../../domain/inventory/InventoryLot';

interface WasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: Product | null;
  initialStock?: number;
}

const WASTE_REASONS = [
  { value: 'DAMAGED', label: 'Mercadería dañada / rota' },
  { value: 'EXPIRED', label: 'Producto vencido / caducado' },
  { value: 'LOST', label: 'Pérdida / extravío' },
  { value: 'INTERNAL_USE', label: 'Consumo interno del negocio' },
  { value: 'OTHER', label: 'Otro motivo de merma' },
];

export const WasteModal: React.FC<WasteModalProps> = ({
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
  const [productLots, setProductLots] = useState<InventoryLotWithStock[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [wasteQtyInput, setWasteQtyInput] = useState<string>('');
  const [reasonCode, setReasonCode] = useState<ReasonCode>('DAMAGED');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLots = async (prodId: string) => {
    try {
      const lotRepo = repositoryFactory.getInventoryLotRepository();
      const lots = await lotRepo.listByProductWithStock(prodId, businessId);
      setProductLots(lots.filter((l) => l.currentStock > 0));
    } catch {
      setProductLots([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProduct(initialProduct);
      setCurrentStock(initialStock);
      setSelectedLotId('');
      setWasteQtyInput('');
      setReasonCode('DAMAGED');
      setNotes('');
      setError(null);

      if (initialProduct) {
        loadLots(initialProduct.id);
      } else {
        setProductLots([]);
      }
    }
  }, [isOpen, initialProduct, initialStock]);

  if (!isOpen) return null;

  const baseUnitCode = selectedProduct?.baseUnit || 'UNIT';
  const unitDef = getBaseUnitDefinition(baseUnitCode);

  const handleProductSelect = (option: ProductSelectionOption | null) => {
    if (option) {
      setSelectedProduct(option.product);
      setCurrentStock(option.currentStock);
      loadLots(option.product.id);
    } else {
      setSelectedProduct(null);
      setCurrentStock(0);
      setProductLots([]);
    }
    setSelectedLotId('');
    setError(null);
  };

  const parsedWasteQty = parseQuantityInput(wasteQtyInput, baseUnitCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setError('Debes seleccionar un producto.');
      return;
    }

    if (parsedWasteQty === null || parsedWasteQty <= 0) {
      setError(`Ingresa una cantidad a dar de baja válida (${unitDef.allowDecimals ? 'admite decimales' : 'solo números enteros'}).`);
      return;
    }

    if (parsedWasteQty > currentStock) {
      setError(`No puedes registrar una merma mayor al stock disponible (${formatQuantity(currentStock, baseUnitCode)}).`);
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
        lotId: selectedLotId || null,
        movementType: 'WASTE',
        quantityDelta: -parsedWasteQty, // negative delta
        reasonCode,
        note: notes.trim() ? notes.trim() : null,
        createdByUserId: userId,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la merma.');
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
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">Registrar merma o pérdida</h3>
              <p className="text-xs text-text-tertiary">
                Da de baja productos dañados, vencidos, extraviados o de consumo interno
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
                <span className="text-xs text-text-secondary">Stock disponible para dar de baja:</span>
              </div>
              <span className="text-xs font-mono font-bold text-text-primary">
                {formatQuantity(currentStock, baseUnitCode)}
              </span>
            </div>
          )}

          {/* Quantity to waste */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Cantidad a dar de baja <span className="text-status-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={wasteQtyInput}
                onChange={(e) => {
                  setWasteQtyInput(e.target.value);
                  setError(null);
                }}
                placeholder={unitDef.allowDecimals ? 'Ej. 0.500' : 'Ej. 2'}
                className="w-full px-3 py-2 pr-12 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-tertiary pointer-events-none">
                {unitDef.shortLabel}
              </span>
            </div>
          </div>

          {/* Reason Code */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Motivo de la merma <span className="text-status-danger">*</span>
            </label>
            <Select
              value={reasonCode}
              onChange={(val) => setReasonCode(val as ReasonCode)}
              options={WASTE_REASONS}
              className="w-full"
            />
          </div>

          {/* Lot Selection (if product has active lots) */}
          {productLots.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers size={13} className="text-brand-primary" /> Lote de origen <span className="text-text-tertiary font-normal">(Opcional)</span>
              </label>
              <Select
                value={selectedLotId}
                onChange={(val) => setSelectedLotId(val)}
                options={[
                  { value: '', label: 'Sin lote asignado (Stock general)' },
                  ...productLots.map((l) => ({
                    value: l.id,
                    label: `${l.lotCode || 'Lote sin código'} — Stock: ${formatQuantity(l.currentStock, baseUnitCode)}${l.expirationDate ? ` (Vence: ${l.expirationDate})` : ''}`,
                  })),
                ]}
                className="w-full"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Nota / Detalle <span className="text-text-tertiary font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Envase quebrado durante reposición"
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Stock reduction warning callout */}
          {parsedWasteQty !== null && parsedWasteQty > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <AlertTriangle size={18} className="text-rose-500 shrink-0" />
              <div className="text-xs text-rose-500 font-medium">
                El stock total disminuirá en <span className="font-bold font-mono">{formatQuantity(parsedWasteQty, baseUnitCode)}</span> (Nuevo stock estimado: {formatQuantity(Math.max(0, currentStock - parsedWasteQty), baseUnitCode)}).
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              isLoading={submitting}
            >
              Registrar merma
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
