import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface PinInputHandle {
  focus: () => void;
  blur: () => void;
}

export interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (pin: string) => void;
  length?: number;
  hasError?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  variant?: 'box' | 'dots';
  className?: string;
}

export const PinInput = forwardRef<PinInputHandle, PinInputProps>(({
  value,
  onChange,
  onComplete,
  length = 4,
  hasError = false,
  isSuccess = false,
  disabled = false,
  autoFocus = false,
  label,
  variant = 'box',
  className = '',
}, ref) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => hiddenInputRef.current?.focus(),
    blur: () => hiddenInputRef.current?.blur(),
  }));

  useEffect(() => {
    if (autoFocus && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(raw);
    if (raw.length === length && onComplete) {
      onComplete(raw);
    }
  };

  const handleContainerClick = () => {
    if (!disabled && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  const digits = value.split('');

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && (
        <label
          onClick={handleContainerClick}
          className="text-xs font-semibold text-text-secondary select-none cursor-pointer"
        >
          {label}
        </label>
      )}

      {/* Hidden real input for physical keyboard support */}
      <input
        ref={hiddenInputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label={label || 'PIN de 4 dígitos'}
      />

      {/* 1. Variant 'dots' (Used in Login PIN for minimalist elegance) */}
      {variant === 'dots' && (
        <div
          onClick={handleContainerClick}
          className={`flex items-center justify-center gap-4 py-2 px-3 cursor-pointer select-none ${
            hasError ? 'animate-shake' : ''
          }`}
        >
          {Array.from({ length }).map((_, index) => {
            const isFilled = index < digits.length;
            const isCurrent = index === digits.length && !disabled;

            return (
              <div
                key={index}
                className={`transition-all duration-150 rounded-full flex items-center justify-center ${
                  hasError
                    ? 'w-4 h-4 bg-status-danger border-2 border-status-danger ring-2 ring-status-danger/30'
                    : isFilled
                    ? 'w-4 h-4 bg-brand-primary border-2 border-brand-primary shadow-xs ring-2 ring-brand-primary/20 scale-105'
                    : isCurrent
                    ? 'w-4 h-4 border-2 border-brand-primary bg-brand-primary/15 animate-pulse'
                    : 'w-4 h-4 border-2 border-border-strong bg-surface-secondary/40'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* 2. Variant 'box' (Refined credential setup cells used in Paso 5) */}
      {variant === 'box' && (
        <div
          onClick={handleContainerClick}
          className={`flex items-center gap-2.5 p-1 cursor-pointer select-none ${
            hasError ? 'animate-shake' : ''
          }`}
        >
          {Array.from({ length }).map((_, index) => {
            const isFilled = index < digits.length;
            const isCurrent = index === digits.length && !disabled;

            return (
              <div
                key={index}
                className={`w-11 h-12 sm:w-12 sm:h-13 rounded-[var(--radius-button)] border flex items-center justify-center transition-all duration-150 shadow-xs ${
                  hasError
                    ? 'border-status-danger bg-status-danger-bg/30 text-status-danger ring-1 ring-status-danger/30'
                    : isSuccess
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30 text-emerald-500'
                    : isCurrent
                    ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30 shadow-sm'
                    : isFilled
                    ? 'border-border-strong bg-surface text-text-primary'
                    : 'border-border-default bg-surface-secondary/50 text-text-tertiary hover:border-border-strong'
                }`}
              >
                {isFilled ? (
                  <span className="w-3 h-3 rounded-full bg-text-primary animate-in zoom-in-75 duration-100" />
                ) : isCurrent ? (
                  <span className="w-1 h-3.5 bg-brand-primary rounded-full animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/40" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

PinInput.displayName = 'PinInput';
