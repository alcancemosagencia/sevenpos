import React, { useState } from 'react';
import { CurrencyCode } from '../../types/country';
import {
  getCurrencyDefinition,
  parseMoneyInput,
  formatMoney,
  toMajorUnits,
} from '../../domain/common/money/Money';

export interface MoneyInputProps {
  id?: string;
  name?: string;
  label?: string;
  helperText?: string;
  error?: string | null;
  valueMinor: number | null;
  onChangeMinor: (minor: number | null) => void;
  currency: CurrencyCode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  id,
  name,
  label,
  helperText,
  error,
  valueMinor,
  onChangeMinor,
  currency,
  placeholder = '0',
  required = false,
  disabled = false,
  className = '',
  autoFocus = false,
}) => {
  const currencyDef = getCurrencyDefinition(currency);

  // Initialize raw input string from valueMinor according to currency exponent
  const [rawInput, setRawInput] = useState<string>(() => {
    if (valueMinor === null || valueMinor === undefined) return '';
    return String(toMajorUnits(valueMinor, currency));
  });
  const [prevValueMinor, setPrevValueMinor] = useState(valueMinor);

  // Synchronize internal rawInput when valueMinor changes externally during render
  if (valueMinor !== prevValueMinor) {
    setPrevValueMinor(valueMinor);
    if (valueMinor === null || valueMinor === undefined) {
      setRawInput('');
    } else {
      const currentParsed = parseMoneyInput(rawInput, currency);
      if (currentParsed !== valueMinor) {
        setRawInput(String(toMajorUnits(valueMinor, currency)));
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawInput(val);

    if (!val.trim()) {
      onChangeMinor(null);
      return;
    }

    const parsed = parseMoneyInput(val, currency);
    onChangeMinor(parsed);
  };

  const previewMinor = parseMoneyInput(rawInput, currency);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-text-secondary uppercase tracking-wider"
        >
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-text-tertiary font-bold text-sm pointer-events-none select-none">
          {currencyDef.symbol}
        </span>

        <input
          id={id}
          name={name}
          type="text"
          inputMode={currencyDef.minorUnitExponent === 0 ? 'numeric' : 'decimal'}
          value={rawInput}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full pl-8 pr-3.5 py-2.5 bg-surface-secondary border ${
            error
              ? 'border-status-danger focus:border-status-danger'
              : 'border-border-default focus:border-brand-primary'
          } rounded-xl text-text-primary text-sm font-bold focus:outline-none transition-colors disabled:opacity-50`}
        />
      </div>

      {/* Formatted live preview if valid input */}
      {previewMinor !== null && previewMinor > 0 && (
        <p className="text-[11px] text-text-tertiary">
          Formato: <span className="text-emerald-400 font-semibold">{formatMoney(previewMinor, currency)}</span>
        </p>
      )}

      {error ? (
        <p className="text-xs text-status-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-text-tertiary">{helperText}</p>
      ) : null}
    </div>
  );
};
