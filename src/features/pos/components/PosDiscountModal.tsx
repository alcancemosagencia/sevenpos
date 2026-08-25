import React, { useState, useEffect } from 'react';
import { GlobalDiscountType } from '../context/CartContext';
import { Button } from '../../../components/ui/Button';
import { X, Tag, DollarSign, Percent } from 'lucide-react';

interface PosDiscountModalProps {
  isOpen: boolean;
  subtotal: number;
  initialType?: GlobalDiscountType;
  initialValue?: number;
  onClose: () => void;
  onApplyDiscount: (discount: { type: GlobalDiscountType; value: number } | null) => void;
}

export const PosDiscountModal: React.FC<PosDiscountModalProps> = ({
  isOpen,
  subtotal,
  initialType = 'FIXED',
  initialValue = 0,
  onClose,
  onApplyDiscount,
}) => {
  const [type, setType] = useState<GlobalDiscountType>(initialType);
  const [amountStr, setAmountStr] = useState<string>(initialValue > 0 ? String(initialValue) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(initialType);
      setAmountStr(initialValue > 0 ? String(initialValue) : '');
      setError(null);
    }
  }, [isOpen, initialType, initialValue]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!amountStr.trim() || Number(amountStr) <= 0) {
      onApplyDiscount(null);
      onClose();
      return;
    }

    const val = Number(amountStr);
    if (isNaN(val) || !Number.isInteger(val) || val < 0) {
      setError('Ingresa un valor entero válido.');
      return;
    }

    if (type === 'PERCENTAGE') {
      if (val > 100) {
        setError('El porcentaje de descuento no puede ser mayor a 100%.');
        return;
      }
    } else {
      if (val > subtotal) {
        setError(`El descuento fijo no puede exceder el subtotal ($${subtotal.toLocaleString('es-ES')}).`);
        return;
      }
    }

    onApplyDiscount({ type, value: val });
    onClose();
  };

  const handleRemove = () => {
    onApplyDiscount(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm dark:bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success flex items-center justify-center">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Descuento de la venta</h2>
              <p className="text-xs text-text-secondary">Subtotal actual: ${subtotal.toLocaleString('es-ES')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Type Toggle */}
          <div className="flex p-1 bg-surface-secondary border border-border-default rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setType('FIXED');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'FIXED'
                  ? 'bg-surface text-brand-primary shadow-xs border border-border-default'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <DollarSign size={14} />
              <span>Monto fijo ($)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('PERCENTAGE');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'PERCENTAGE'
                  ? 'bg-surface text-brand-primary shadow-xs border border-border-default'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Percent size={14} />
              <span>Porcentaje (%)</span>
            </button>
          </div>

          {/* Value Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              {type === 'FIXED' ? 'Monto del descuento' : 'Porcentaje de descuento'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary font-bold text-sm">
                {type === 'FIXED' ? '$' : '%'}
              </span>
              <input
                type="number"
                min="0"
                max={type === 'PERCENTAGE' ? '100' : String(subtotal)}
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                placeholder={type === 'FIXED' ? '0' : 'Ej. 10'}
                className="w-full pl-8 pr-4 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-base font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                autoFocus
              />
            </div>
            {error && <p className="text-xs font-medium text-status-danger">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-default bg-surface-secondary/20">
          {initialValue > 0 ? (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-semibold text-status-danger hover:underline"
            >
              Quitar descuento
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
