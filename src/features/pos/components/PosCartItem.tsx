import React from 'react';
import { CartLine } from '../context/CartContext';
import { QUANTITY_SCALE, formatQuantity } from '../../../domain/common/quantity/Quantity';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Plus, Minus, Trash2, Layers } from 'lucide-react';

export interface PosCartItemProps {
  item: CartLine;
  currency?: CurrencyCode;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
}

export const PosCartItem: React.FC<PosCartItemProps> = ({
  item,
  currency = 'CLP',
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  const isFractional = item.baseUnit !== 'UNIT';
  const qtyDisplay = isFractional
    ? formatQuantity(item.quantity, item.baseUnit, false)
    : String(item.quantity / QUANTITY_SCALE);

  const formattedUnitPrice = formatMoney(item.unitPrice, currency);
  const formattedLineTotal = formatMoney(item.lineTotal, currency);

  return (
    <div
      data-testid={`pos-cart-item-${item.lineId}`}
      className="flex flex-col p-3 sm:p-3.5 rounded-2xl bg-surface border border-border-default hover:border-border-default/80 transition-colors gap-1.5"
    >
      {/* 1. TOP ROW: Product Name & Trash Delete Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 pr-1">
          <span
            className="text-xs sm:text-sm font-bold text-text-primary line-clamp-2 break-words leading-tight"
            title={item.productName}
          >
            {item.productName}
          </span>
          {item.presentationName && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold">
                <Layers size={10} />
                {item.presentationName}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.lineId)}
          className="w-7 h-7 -mr-1 -mt-0.5 flex items-center justify-center rounded-lg text-text-tertiary hover:text-status-danger hover:bg-status-danger/10 transition-colors cursor-pointer shrink-0"
          title="Eliminar producto"
          aria-label="Eliminar producto"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 2. SECOND ROW: Unit Price + 'c/u' */}
      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-text-tertiary flex-wrap">
        <span>{`${formattedUnitPrice} c/u`}</span>
        {item.unitFactor > 1 && <span>{`(x${item.unitFactor} base)`}</span>}
        {item.discountTotal > 0 && (
          <span className="text-status-success font-medium">
            {`- ${formatMoney(item.discountTotal, currency)} desc.`}
          </span>
        )}
      </div>

      {/* 3. THIRD ROW: Line Subtotal Emphasized (Left) + Quantity Stepper (Right) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <span className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
            {formattedLineTotal}
          </span>
        </div>

        <div className="flex items-center bg-surface-secondary border border-border-default rounded-xl p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onDecrement(item.lineId)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Disminuir cantidad"
            aria-label="Disminuir cantidad"
          >
            <Minus size={13} />
          </button>
          <span className="min-w-[32px] px-1 text-center text-xs sm:text-sm font-bold text-text-primary select-none">
            {qtyDisplay}
          </span>
          <button
            type="button"
            onClick={() => onIncrement(item.lineId)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Aumentar cantidad"
            aria-label="Aumentar cantidad"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
