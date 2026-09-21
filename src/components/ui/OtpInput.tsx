import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { EMAIL_CONFIG } from '../../domain/email/EmailConfig';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = EMAIL_CONFIG.TRANSACTIONAL.DEFAULT_OTP_LENGTH,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
  className = '',
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Array of digits based on length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length && inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value;
    const cleanDigit = rawVal.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const combined = newDigits.join('').slice(0, length);
    onChange(combined);

    if (cleanDigit && index < length - 1) {
      focusInput(index + 1);
    }

    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous and clear it
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        focusInput(index - 1);
      } else if (digits[index]) {
        // Clear current
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text/plain').trim();
    const cleanNumbers = pastedData.replace(/\D/g, '').slice(0, length);

    if (!cleanNumbers) return;

    onChange(cleanNumbers);

    // Focus last filled digit or first empty digit
    const nextIndex = Math.min(cleanNumbers.length, length - 1);
    focusInput(nextIndex);

    if (cleanNumbers.length === length && onComplete) {
      onComplete(cleanNumbers);
    }
  };

  return (
    <div
      role="group"
      aria-label={`Código de verificación de ${length} dígitos`}
      className={`flex items-center justify-center gap-1.5 sm:gap-2.5 ${className}`}
    >
      {Array.from({ length }, (_, index) => {
        const digit = digits[index] || '';
        const isFilled = digit.length > 0;

        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            value={digit}
            disabled={disabled}
            aria-label={`Dígito ${index + 1} de ${length}`}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-9 h-12 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border transition-all outline-none ${
              hasError
                ? 'border-status-danger/70 bg-status-danger/5 text-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20'
                : isFilled
                ? 'border-brand-primary/60 bg-surface text-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
                : 'border-border-default bg-surface-secondary text-text-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        );
      })}
    </div>
  );
};
