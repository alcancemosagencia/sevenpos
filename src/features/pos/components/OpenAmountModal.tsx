import React, { useState, useEffect, useRef } from 'react';
import { CurrencyCode } from '../../../types/country';
import { formatMoney } from '../../../domain/common/money/Money';
import { Button } from '../../../components/ui/Button';
import { Calculator, X, Delete, Tag } from 'lucide-react';

export interface OpenAmountModalProps {
  isOpen: boolean;
  currency?: CurrencyCode;
  onClose: () => void;
  onConfirm: (amount: number, description?: string) => void;
}

const QUICK_DESCRIPTIONS = [
  'Venta rápida',
  'Servicio',
  'Flete / Despacho',
  'Varios',
  'Ajuste',
];

export const OpenAmountModal: React.FC<OpenAmountModalProps> = ({
  isOpen,
  currency = 'CLP',
  onClose,
  onConfirm,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmountStr('');
      setDescription('');
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedAmount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setAmountStr('');
      return;
    }
    if (val === 'BACKSPACE') {
      setAmountStr((prev) => prev.slice(0, -1));
      return;
    }
    if (val === '00' || val === '000') {
      if (!amountStr || amountStr === '0') return;
      setAmountStr((prev) => prev + val);
      return;
    }
    // Limit max length to avoid overflow
    if (amountStr.length >= 10) return;
    setAmountStr((prev) => (prev === '0' ? val : prev + val));
  };

  const handlePresetAmount = (presetVal: number) => {
    setAmountStr(String(presetVal));
  };

  const handleQuickDesc = (desc: string) => {
    setDescription(desc);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (parsedAmount <= 0) return;
    onConfirm(parsedAmount, description.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Monto libre / Calculadora
              </h2>
              <p className="text-xs text-text-tertiary">
                Venta rápida sin producto del catálogo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Amount Display */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Monto a cobrar <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                value={parsedAmount > 0 ? formatMoney(parsedAmount, currency) : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmountStr(raw);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="$0"
                className="w-full text-center text-3xl font-bold py-3 px-4 bg-surface-secondary border-2 border-border-default focus:border-brand-primary rounded-2xl text-text-primary placeholder:text-text-tertiary/40 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Preset Amounts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[1000, 2000, 5000, 10000, 20000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetAmount(preset)}
                className="flex-1 min-w-[56px] py-1.5 px-2 rounded-xl border border-border-default bg-surface-secondary/70 hover:bg-surface-secondary text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-center whitespace-nowrap"
              >
                ${preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-2.5 sm:py-3 bg-surface-secondary/50 hover:bg-surface-secondary border border-border-default/70 rounded-xl text-base sm:text-lg font-bold text-text-primary active:scale-95 transition-all cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('000')}
              className="py-2.5 sm:py-3 bg-surface-secondary/30 hover:bg-surface-secondary border border-border-default/70 rounded-xl text-sm sm:text-base font-bold text-text-secondary active:scale-95 transition-all cursor-pointer select-none"
            >
              000
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 sm:py-3 bg-surface-secondary/50 hover:bg-surface-secondary border border-border-default/70 rounded-xl text-base sm:text-lg font-bold text-text-primary active:scale-95 transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('BACKSPACE')}
              className="py-2.5 sm:py-3 bg-surface-secondary/30 hover:bg-status-danger/10 hover:text-status-danger border border-border-default/70 rounded-xl flex items-center justify-center text-text-tertiary active:scale-95 transition-all cursor-pointer select-none"
              aria-label="Borrar dígito"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Description Input & Quick Suggestions */}
          <div className="space-y-2 pt-1 border-t border-border-default/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Descripción / Detalle <span className="text-text-tertiary font-normal">(Opcional)</span>
              </label>
            </div>

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Servicio técnico, Flete express..."
              className="w-full px-3.5 py-2 bg-surface-secondary border border-border-default rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary transition-colors"
              maxLength={100}
            />

            {/* Quick description chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_DESCRIPTIONS.map((desc) => (
                <button
                  key={desc}
                  type="button"
                  onClick={() => handleQuickDesc(desc)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                    description === desc
                      ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary font-bold'
                      : 'bg-surface-secondary/60 border-border-default/80 text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <Tag size={10} />
                  {desc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2.5 p-4 sm:p-5 border-t border-border-default bg-surface-secondary/30">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            variant="brand"
            size="md"
            onClick={() => handleSubmit()}
            disabled={parsedAmount <= 0}
            className="flex-1 justify-center font-bold"
          >
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
};
