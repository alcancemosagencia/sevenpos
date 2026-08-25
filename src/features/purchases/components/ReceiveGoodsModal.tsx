import React, { useState } from 'react';
import {
  X,
  PackageCheck,
  AlertCircle,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DatePicker } from '../../../components/ui/DatePicker';
import { PurchaseOrderWithDetails } from '../../../domain/purchases/PurchaseOrder';
import { ReceiveGoodsDto, ReceiveGoodsItemDto } from '../../../domain/purchases/PurchaseReceipt';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { ReceivePurchaseOrder } from '../../../application/purchases/ReceivePurchaseOrder';
import { QUANTITY_SCALE } from '../../../domain/common/quantity/Quantity';
import { generateUUID } from '../../../domain/common/IdGenerator';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrderWithDetails;
  onSuccess: () => Promise<void>;
}

interface ReceiveLineState {
  purchaseOrderItemId: string;
  productName: string;
  presentationName: string | null;
  presentationFactor: number;
  baseUnit: string;
  pendingQuantity: number; // Scaled: 1000 in presentation units
  receivedQuantityInput: number; // e.g. 5
  unitCostInput: number; // Minor currency integer
  lotCode: string;
  expirationDate: string;
  showLotInputs: boolean;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [lines, setLines] = useState<ReceiveLineState[]>(() =>
    order.items
      .filter((it) => it.pendingQuantity > 0)
      .map((it) => ({
        purchaseOrderItemId: it.id,
        productName: it.productNameSnapshot,
        presentationName: it.presentationNameSnapshot,
        presentationFactor: it.presentationFactor || 1,
        baseUnit: it.baseUnit,
        pendingQuantity: it.pendingQuantity,
        receivedQuantityInput: it.pendingQuantity / QUANTITY_SCALE,
        unitCostInput: it.unitCost,
        lotCode: '',
        expirationDate: '',
        showLotInputs: false,
      }))
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateLine = (
    itemId: string,
    updates: Partial<Pick<ReceiveLineState, 'receivedQuantityInput' | 'unitCostInput' | 'lotCode' | 'expirationDate' | 'showLotInputs'>>
  ) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.purchaseOrderItemId !== itemId) return line;
        return { ...line, ...updates };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeLines = lines.filter((l) => l.receivedQuantityInput > 0);
    if (activeLines.length === 0) {
      setError('Debes ingresar una cantidad mayor a 0 para al menos un producto.');
      return;
    }

    // Over-receipt check
    for (const l of activeLines) {
      const maxQty = l.pendingQuantity / QUANTITY_SCALE;
      if (l.receivedQuantityInput > maxQty) {
        setError(
          `La cantidad a recibir para "${l.productName}" (${l.receivedQuantityInput}) excede la cantidad pendiente (${maxQty}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderRepo = repositoryFactory.getPurchaseOrderRepository();
      const receiveUseCase = new ReceivePurchaseOrder(orderRepo);

      const itemsDto: ReceiveGoodsItemDto[] = activeLines.map((l) => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        receivedQuantity: Math.round(l.receivedQuantityInput * QUANTITY_SCALE),
        unitCost: l.unitCostInput,
        lotCode: l.lotCode.trim() || null,
        expirationDate: l.expirationDate || null,
      }));

      const dto: ReceiveGoodsDto = {
        purchaseOrderId: order.id,
        receivedByUserId: 'primary-user',
        receivedByNameSnapshot: 'José Pérez',
        note: note.trim() || null,
        idempotencyKey: generateUUID(),
        items: itemsDto,
      };

      await receiveUseCase.execute(order.businessId, dto);
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la recepción de mercadería.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItemsToReceive = lines.reduce(
    (sum, l) => sum + (l.receivedQuantityInput > 0 ? 1 : 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-border-strong rounded-2xl shadow-2xl my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <PackageCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                Recepción de Mercadería
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary">
                  {order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-text-secondary">
                Proveedor: <span className="text-text-primary font-medium">{order.supplier.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-500 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold uppercase tracking-wider">
                Productos Pendientes por Recibir
              </span>
              <span>{totalItemsToReceive} producto(s) a ingresar al inventario</span>
            </div>

            <div className="border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle">
              {lines.map((line) => {
                const maxPending = line.pendingQuantity / QUANTITY_SCALE;
                return (
                  <div
                    key={line.purchaseOrderItemId}
                    className="p-4 bg-surface-secondary/20 hover:bg-surface-secondary/40 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-text-primary flex items-center gap-2">
                          <span>{line.productName}</span>
                          {line.presentationName && (
                            <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-xs font-semibold">
                              {line.presentationName} (x{line.presentationFactor})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          Pendiente total:{' '}
                          <span className="font-mono text-text-secondary font-bold">
                            {maxPending.toLocaleString('es-CL')}
                          </span>{' '}
                          {line.presentationName || line.baseUnit} • Equivalente base:{' '}
                          <span className="font-mono text-text-secondary font-semibold">
                            {(line.receivedQuantityInput * line.presentationFactor).toLocaleString(
                              'es-CL'
                            )}{' '}
                            {line.baseUnit}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Received Quantity Input */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-text-tertiary">Recibir:</label>
                          <input
                            type="number"
                            min="0"
                            max={maxPending}
                            step="1"
                            value={line.receivedQuantityInput}
                            onChange={(e) =>
                              handleUpdateLine(line.purchaseOrderItemId, {
                                receivedQuantityInput: Math.max(
                                  0,
                                  Math.min(maxPending, parseInt(e.target.value, 10) || 0)
                                ),
                              })
                            }
                            className="w-20 px-2.5 py-1.5 bg-surface border border-border-default rounded-lg text-sm text-text-primary text-center font-mono font-bold focus:outline-none focus:border-brand-primary"
                          />
                        </div>

                        {/* Unit Cost Received */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-text-tertiary">Costo:</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={line.unitCostInput}
                              onChange={(e) =>
                                handleUpdateLine(line.purchaseOrderItemId, {
                                  unitCostInput: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className="w-24 pl-5 pr-2 py-1.5 bg-surface border border-border-default rounded-lg text-sm text-text-primary text-right font-mono focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lot & Expiration Details Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateLine(line.purchaseOrderItemId, {
                            showLotInputs: !line.showLotInputs,
                          })
                        }
                        className="text-xs text-brand-primary hover:underline flex items-center gap-1.5 font-medium"
                      >
                        <Tag size={13} />
                        <span>
                          {line.showLotInputs
                            ? 'Ocultar lote y vencimiento'
                            : '+ Asignar lote o fecha de vencimiento'}
                        </span>
                      </button>

                      {line.showLotInputs && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 p-3 bg-surface border border-border-default rounded-xl">
                          <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                              Código de Lote
                            </label>
                            <input
                              type="text"
                              value={line.lotCode}
                              onChange={(e) =>
                                handleUpdateLine(line.purchaseOrderItemId, {
                                  lotCode: e.target.value,
                                })
                              }
                              placeholder="Ej. LOT-2026-08"
                              className="w-full px-3 py-1.5 bg-surface-secondary border border-border-default rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-brand-primary"
                            />
                          </div>

                          <div>
                            <DatePicker
                              label="Fecha de Vencimiento"
                              value={line.expirationDate}
                              onChange={(val) =>
                                handleUpdateLine(line.purchaseOrderItemId, {
                                  expirationDate: val,
                                })
                              }
                              placeholder="Seleccionar..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Observaciones de Recepción / N° de Guía o Factura
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Guía de despacho #45892, mercadería recibida conforme en bodega..."
              rows={2}
              className="w-full px-3.5 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-primary transition-colors resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || totalItemsToReceive === 0}
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Registrando ingreso...' : 'Confirmar recepción física'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
