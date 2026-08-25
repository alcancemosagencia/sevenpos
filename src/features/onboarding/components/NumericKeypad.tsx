import React from 'react';
import { Delete, Check } from 'lucide-react';

export interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  canSubmit?: boolean;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigit,
  onDelete,
  onSubmit,
  disabled = false,
  canSubmit = false,
  className = '',
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className={`grid grid-cols-3 gap-3 sm:gap-3.5 max-w-[260px] sm:max-w-[280px] mx-auto select-none ${className}`}
    >
      {/* 1 - 9 */}
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(digit)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-secondary/70 hover:bg-surface-secondary text-text-primary font-bold text-xl sm:text-2xl border border-border-default hover:border-border-strong active:scale-90 transition-all duration-100 flex items-center justify-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
          aria-label={`Número ${digit}`}
        >
          {digit}
        </button>
      ))}

      {/* Backspace ⌫ */}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-secondary/40 hover:bg-surface-secondary text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong active:scale-90 transition-all duration-100 flex items-center justify-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
        aria-label="Borrar dígito"
      >
        <Delete size={20} strokeWidth={2.2} />
      </button>

      {/* 0 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit('0')}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-secondary/70 hover:bg-surface-secondary text-text-primary font-bold text-xl sm:text-2xl border border-border-default hover:border-border-strong active:scale-90 transition-all duration-100 flex items-center justify-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
        aria-label="Número 0"
      >
        0
      </button>

      {/* Submit / Confirm ✓ */}
      <button
        type="button"
        disabled={disabled || !canSubmit}
        onClick={onSubmit}
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-bold border active:scale-90 transition-all duration-100 flex items-center justify-center shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-25 disabled:cursor-not-allowed mx-auto ${
          canSubmit
            ? 'bg-brand-primary text-white border-brand-primary hover:bg-brand-hover cursor-pointer'
            : 'bg-surface-secondary/40 text-text-tertiary border-border-default cursor-not-allowed'
        }`}
        aria-label="Confirmar PIN"
      >
        <Check size={22} strokeWidth={2.8} />
      </button>
    </div>
  );
};
