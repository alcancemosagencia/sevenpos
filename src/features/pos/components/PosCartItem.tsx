import React from 'react';
import { CartLine } from '../context/CartContext';
import { QUANTITY_SCALE, formatQuantity } from '../../../domain/common/quantity/Quantity';
import { formatWeightDisplay } from '../../../domain/sales/WeightedMath';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Plus, Minus, Trash2, Layers, Scale, Calculator, Edit2 } from 'lucide-react';

export interface PosCartItemProps {
  item: CartLine;
  currency?: CurrencyCode;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onEditWeight?: (lineId: string, item: CartLine) => void;
}

export const PosCartItem: React.FC<PosCartItemProps> = ({
  item,
  currency = 'CLP',
  onIncrement,
  onDecrement,
  onRemove,
  onEditWeight,
}) => {
  const isWeighted = item.saleMode === 'WEIGHT' || item.weightGrams != null;
  const isOpenAmount = item.lineType === 'OPEN_AMOUNT';

  const isFractional = !isWeighted && item.baseUnit !== 'UNIT';
  const qtyDisplay = isWeighted
    ? formatWeightDisplay(item.weightGrams || item.quantity)
    : isFractional
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-xs sm:text-sm font-bold text-text-primary line-clamp-2 break-words leading-tight"
              title={item.productName}
            >
              {item.productName}
            </span>

            {isOpenAmount && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-semibold">
                <Calculator size={10} />
                Monto libre
              </span>
            )}
          </div>

          {item.presentationName && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold">
                <Layers size={10} />
                {item.presentationName}
              </span>
            </div>
          )}

          {isWeighted && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold">
                <Scale size={10} />
                Por peso ({qtyDisplay})
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

      {/* 2. SECOND ROW: Unit Price Details */}
      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-text-tertiary flex-wrap">
        {isOpenAmount ? (
          <span>Cobro directo</span>
        ) : isWeighted ? (
          <span>{`${formattedUnitPrice} / kg`}</span>
        ) : (
          <span>{`${formattedUnitPrice} c/u`}</span>
        )}

        {item.unitFactor > 1 && <span>{`(x${item.unitFactor} base)`}</span>}
        {item.discountTotal > 0 && (
          <span className="text-status-success font-medium">
            {`- ${formatMoney(item.discountTotal, currency)} desc.`}
          </span>
        )}
      </div>

      {/* 3. THIRD ROW: Line Subtotal (Left) + Stepper or Edit Button (Right) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <span className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
            {formattedLineTotal}
          </span>
        </div>

        {isWeighted ? (
          /* Weighted line item: Edit weight button */
          <button
            type="button"
            onClick={() => onEditWeight && onEditWeight(item.lineId, item)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-secondary hover:bg-surface-tertiary border border-border-default rounded-xl text-xs font-semibold text-text-primary transition-colors cursor-pointer"
            title="Modificar peso del producto"
          >
            <Edit2 size={12} className="text-text-tertiary" />
            <span>{qtyDisplay}</span>
          </button>
        ) : isOpenAmount ? (
          /* Open Amount: Static 1 unit indicator */
          <div className="px-2 py-1 bg-surface-secondary border border-border-default rounded-xl text-[11px] font-bold text-text-tertiary select-none">
            1 ítem
          </div>
        ) : (
          /* Standard Unit Stepper */
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
        )}
      </div>
    </div>
  );
};
