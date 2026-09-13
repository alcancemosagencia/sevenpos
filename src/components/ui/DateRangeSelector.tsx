import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';
import { DateRange, DateRangePreset } from '../../application/analytics/types';
import { resolveDateRange } from '../../application/analytics/DateRangeUtils';
import { DatePicker } from './DatePicker';
import { Button } from './Button';

export interface DateRangeOption {
  value: string;
  label: string;
}

export interface DateRangeSelectorPreset {
  key: DateRangePreset;
  label: string;
}

export interface DateRangeSelectorProps {
  // Mode 1: Generic options (e.g., Dashboard period)
  value?: string;
  onChange?: (val: string) => void;
  options?: DateRangeOption[];

  // Mode 2: Analytics DateRange with Preset + Custom Modal Flow (Reports & Audit)
  currentRange?: DateRange;
  onRangeChange?: (range: DateRange) => void;
  presets?: DateRangeSelectorPreset[];

  // Styling & Accessibility
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

const DEFAULT_ANALYTICS_PRESETS: DateRangeSelectorPreset[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'YESTERDAY', label: 'Ayer' },
  { key: 'LAST_7_DAYS', label: 'Últimos 7 días' },
  { key: 'LAST_30_DAYS', label: 'Últimos 30 días' },
  { key: 'THIS_MONTH', label: 'Este mes' },
  { key: 'LAST_MONTH', label: 'Mes anterior' },
  { key: 'CUSTOM', label: 'Personalizado' },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  options,
  currentRange,
  onRangeChange,
  presets = DEFAULT_ANALYTICS_PRESETS,
  className = '',
  buttonClassName = '',
  ariaLabel,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState(() => currentRange?.startDate || '');
  const [customEnd, setCustomEnd] = useState(() => currentRange?.endDate || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Click outside and Escape handlers for popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Escape handler for Custom Modal
  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCustomModalOpen) {
        setIsCustomModalOpen(false);
      }
    };

    if (isCustomModalOpen) {
      document.addEventListener('keydown', handleModalKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [isCustomModalOpen]);

  // Determine label to display on the trigger button
  const displayLabel = React.useMemo(() => {
    if (options && value !== undefined) {
      const found = options.find((opt) => opt.value === value);
      return found ? found.label : value;
    }
    if (currentRange) {
      return currentRange.label;
    }
    return 'Seleccionar fechas';
  }, [options, value, currentRange]);

  const handleSelectOption = (optValue: string) => {
    if (onChange) {
      onChange(optValue);
    }
    setIsOpen(false);
  };

  const handleSelectPreset = (presetKey: DateRangePreset) => {
    if (presetKey === 'CUSTOM') {
      setCustomStart(currentRange?.startDate || '');
      setCustomEnd(currentRange?.endDate || '');
      setIsOpen(false);
      setIsCustomModalOpen(true);
      return;
    }

    if (onRangeChange) {
      const newRange = resolveDateRange(presetKey);
      onRangeChange(newRange);
    }
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd && onRangeChange) {
      const newRange = resolveDateRange('CUSTOM', customStart, customEnd);
      onRangeChange(newRange);
      setIsCustomModalOpen(false);
    }
  };

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        data-testid="daterange-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={ariaLabel || `Rango de fechas actual: ${displayLabel}`}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-default hover:border-border-strong text-xs sm:text-sm font-medium text-text-primary transition-all shadow-xs cursor-pointer select-none ${buttonClassName}`}
      >
        <Calendar size={15} className="text-brand-primary shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-none">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`text-text-tertiary transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Dropdown (Canonical UX: Compact anchored popover on BOTH desktop and mobile) */}
      {isOpen && (
        <div
          data-testid="daterange-selector-popover"
          className={`absolute ${alignmentClass} top-full mt-1.5 w-[min(280px,calc(100vw-32px))] max-h-[min(420px,calc(100vh-120px))] overflow-y-auto bg-surface border border-border-default rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          {/* Header label */}
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-text-tertiary uppercase tracking-wider border-b border-border-subtle">
            Período
          </div>

          {/* Mode 1: Generic Options */}
          {options &&
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`daterange-option-${opt.value}`}
                  onClick={() => handleSelectOption(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-brand-primary/10 text-brand-primary font-bold'
                      : 'text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={16} className="text-brand-primary shrink-0" />}
                </button>
              );
            })}

          {/* Mode 2: Analytics Presets */}
          {!options &&
            presets.map((p) => {
              const isSelected = currentRange?.preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  data-testid={`daterange-preset-${p.key}`}
                  onClick={() => handleSelectPreset(p.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-brand-primary/10 text-brand-primary font-bold'
                      : 'text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <span>{p.label}</span>
                  {isSelected && <Check size={16} className="text-brand-primary shrink-0" />}
                </button>
              );
            })}
        </div>
      )}

      {/* Mode 2 Dedicated Custom Date Range Modal */}
      {isCustomModalOpen && (
        <div
          data-testid="daterange-custom-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div
            ref={modalRef}
            data-testid="daterange-custom-modal"
            className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div>
                <h3 className="text-base font-bold text-text-primary">Rango de fechas personalizado</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Selecciona la fecha inicial y final para filtrar la información.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-xl transition-colors cursor-pointer"
                aria-label="Cerrar modal de fechas personalizadas"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: DatePickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <DatePicker
                  label="Desde"
                  value={customStart}
                  onChange={(val) => setCustomStart(val)}
                  placeholder="YYYY-MM-DD"
                  maxDate={customEnd || undefined}
                />
              </div>
              <div>
                <DatePicker
                  label="Hasta"
                  value={customEnd}
                  onChange={(val) => setCustomEnd(val)}
                  placeholder="YYYY-MM-DD"
                  minDate={customStart || undefined}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCustomModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
              >
                Aplicar fechas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
