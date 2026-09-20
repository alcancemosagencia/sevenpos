import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '../../../domain/catalog/Product';
import { CurrencyCode } from '../../../types/country';
import { formatMoney } from '../../../domain/common/money/Money';
import {
  calculateWeightedLineTotal,
  formatWeightDisplay,
  parseWeightInputToGrams,
} from '../../../domain/sales/WeightedMath';
import { Button } from '../../../components/ui/Button';
import { Scale, X, Delete, AlertCircle } from 'lucide-react';

export interface WeightedProductModalProps {
  isOpen: boolean;
  product: Product | null;
  initialWeightGrams?: number;
  availableStockGrams?: number;
  currency?: CurrencyCode;
  onClose: () => void;
  onConfirm: (product: Product, weightGrams: number) => void;
}

type InputUnit = 'G' | 'KG';

export const WeightedProductModal: React.FC<WeightedProductModalProps> = ({
  isOpen,
  product,
  initialWeightGrams,
  availableStockGrams,
  currency = 'CLP',
  onClose,
  onConfirm,
}) => {
  const [inputUnit, setInputUnit] = useState<InputUnit>('G');
  const [inputValue, setInputValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && product) {
      if (initialWeightGrams && initialWeightGrams > 0) {
        if (initialWeightGrams >= 1000 && initialWeightGrams % 100 === 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setInputUnit('KG');
          setInputValue(String(initialWeightGrams / 1000).replace('.', ','));
        } else {
          setInputUnit('G');
          setInputValue(String(initialWeightGrams));
        }
      } else {
        setInputUnit('G');
        setInputValue('');
      }
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, product, initialWeightGrams]);

  // Parse current grams from raw input
  const parsedGrams = useMemo(() => {
    return parseWeightInputToGrams(inputValue, inputUnit);
  }, [inputValue, inputUnit]);

  // Real-time calculated price
  const lineTotal = useMemo(() => {
    if (!product || parsedGrams <= 0) return 0;
    return calculateWeightedLineTotal(product.salePrice, parsedGrams);
  }, [product, parsedGrams]);

  // Stock exhaustion check
  const isStockExceeded = useMemo(() => {
    if (availableStockGrams == null || availableStockGrams <= 0) return false;
    return parsedGrams > availableStockGrams;
  }, [availableStockGrams, parsedGrams]);

  if (!isOpen || !product) return null;

  const handleUnitToggle = (unit: InputUnit) => {
    if (unit === inputUnit) return;
    if (parsedGrams > 0) {
      if (unit === 'KG') {
        const kgVal = (parsedGrams / 1000).toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
        setInputValue(kgVal);
      } else {
        setInputValue(String(parsedGrams));
      }
    }
    setInputUnit(unit);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const handlePresetClick = (grams: number) => {
    if (inputUnit === 'KG') {
      const kgVal = (grams / 1000).toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
      setInputValue(kgVal);
    } else {
      setInputValue(String(grams));
    }
    inputRef.current?.focus();
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setInputValue('');
      return;
    }
    if (val === 'BACKSPACE') {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }
    if (val === ',' || val === '.') {
      if (inputUnit === 'G') return; // Decimals only in KG mode
      if (inputValue.includes(',') || inputValue.includes('.')) return;
      setInputValue((prev) => (prev ? prev + ',' : '0,'));
      return;
    }
    setInputValue((prev) => prev + val);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (parsedGrams <= 0) return;
    onConfirm(product, parsedGrams);
    onClose();
  };

  const isEditMode = Boolean(initialWeightGrams && initialWeightGrams > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Scale size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text-primary truncate">
                {product.name}
              </h2>
              <p className="text-xs text-text-tertiary">
                {formatMoney(product.salePrice, currency)} / kg
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
          {/* Unit Toggle & Input Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Ingresar peso
              </label>

              {/* G / KG Switcher */}
              <div className="flex bg-surface-secondary border border-border-default rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => handleUnitToggle('G')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    inputUnit === 'G'
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Gramos (g)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle('KG')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    inputUnit === 'KG'
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Kilos (kg)
                </button>
              </div>
            </div>

            {/* Display Input Box */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                inputMode={inputUnit === 'KG' ? 'decimal' : 'numeric'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={inputUnit === 'G' ? '0 g' : '0,000 kg'}
                className="w-full text-center text-3xl font-bold py-3.5 px-4 bg-surface-secondary border-2 border-border-default focus:border-brand-primary rounded-2xl text-text-primary placeholder:text-text-tertiary/40 focus:outline-none transition-colors"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-tertiary">
                {inputUnit === 'G' ? 'g' : 'kg'}
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[100, 250, 500, 1000, 2000].map((presetGrams) => {
              const label = presetGrams >= 1000 ? `${presetGrams / 1000} kg` : `${presetGrams} g`;
              const isSelected = parsedGrams === presetGrams;
              return (
                <button
                  key={presetGrams}
                  type="button"
                  onClick={() => handlePresetClick(presetGrams)}
                  className={`flex-1 min-w-[56px] py-1.5 px-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold'
                      : 'bg-surface-secondary/70 border-border-default hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Keypad (Clean Grid) */}
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
              onClick={() => handleKeypadPress(inputUnit === 'KG' ? ',' : '00')}
              className="py-2.5 sm:py-3 bg-surface-secondary/30 hover:bg-surface-secondary border border-border-default/70 rounded-xl text-sm sm:text-base font-bold text-text-secondary active:scale-95 transition-all cursor-pointer select-none"
            >
              {inputUnit === 'KG' ? ',' : '00'}
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

          {/* Live Price Preview & Formula Breakdown */}
          <div className="p-3 bg-brand-primary/5 border border-brand-primary/15 rounded-2xl flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
                Total calculado
              </span>
              <span className="text-xs text-text-secondary">
                {parsedGrams > 0
                  ? `${formatWeightDisplay(parsedGrams)} × ${formatMoney(product.salePrice, currency)}/kg`
                  : 'Ingresa peso para calcular'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                {formatMoney(lineTotal, currency)}
              </span>
            </div>
          </div>

          {/* Stock Warning */}
          {isStockExceeded && (
            <div className="p-2.5 bg-status-warning/10 border border-status-warning/30 rounded-xl flex items-center gap-2 text-xs text-status-warning">
              <AlertCircle size={15} className="shrink-0" />
              <span>
                Stock disponible insuficiente ({formatWeightDisplay(availableStockGrams || 0)}).
              </span>
            </div>
          )}
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
            disabled={parsedGrams <= 0}
            className="flex-1 justify-center font-bold"
          >
            {isEditMode ? 'Actualizar peso' : 'Agregar al carrito'}
          </Button>
        </div>
      </div>
    </div>
  );
};
