import React from 'react';
import { CartLine } from '../context/CartContext';
import { QUANTITY_SCALE, formatQuantity } from '../../../domain/common/quantity/Quantity';
import { Plus, Minus, Trash2, Layers } from 'lucide-react';

interface PosCartItemProps {
  item: CartLine;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
}

export const PosCartItem: React.FC<PosCartItemProps> = ({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  const isFractional = item.baseUnit !== 'UNIT';
  const qtyDisplay = isFractional
    ? formatQuantity(item.quantity, item.baseUnit, false)
    : String(item.quantity / QUANTITY_SCALE);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-default hover:border-border-default/80 transition-colors gap-2.5">
      {/* Product Info */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-text-primary truncate">{item.productName}</span>
          {item.presentationName && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold">
              <Layers size={10} />
              {item.presentationName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-tertiary">
          <span>${item.unitPrice.toLocaleString('es-ES')} c/u</span>
          {item.unitFactor > 1 && <span>(x{item.unitFactor} base)</span>}
          {item.discountTotal > 0 && (
            <span className="text-status-success font-medium">
              - ${item.discountTotal.toLocaleString('es-ES')} desc.
            </span>
          )}
        </div>
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center gap-1 bg-surface-secondary border border-border-default rounded-lg p-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onDecrement(item.lineId)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
          title="Disminuir cantidad"
        >
          <Minus size={13} />
        </button>
        <span className="w-8 text-center text-xs font-bold text-text-primary select-none">
          {qtyDisplay}
        </span>
        <button
          type="button"
          onClick={() => onIncrement(item.lineId)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
          title="Aumentar cantidad"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Line Total & Delete */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-text-primary w-16 text-right">
          ${item.lineTotal.toLocaleString('es-ES')}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.lineId)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-status-danger hover:bg-status-danger/10 transition-colors"
          title="Quitar del carrito"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
