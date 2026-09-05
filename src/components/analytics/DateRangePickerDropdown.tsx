import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { DateRange, DateRangePreset } from '../../application/analytics/types';
import { resolveDateRange } from '../../application/analytics/DateRangeUtils';
import { DatePicker } from '../ui/DatePicker';

interface DateRangePickerDropdownProps {
  currentRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'YESTERDAY', label: 'Ayer' },
  { key: 'LAST_7_DAYS', label: 'Últimos 7 días' },
  { key: 'LAST_30_DAYS', label: 'Últimos 30 días' },
  { key: 'THIS_MONTH', label: 'Este mes' },
  { key: 'LAST_MONTH', label: 'Mes anterior' },
  { key: 'CUSTOM', label: 'Personalizado' },
];

export const DateRangePickerDropdown: React.FC<DateRangePickerDropdownProps> = ({
  currentRange,
  onRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(currentRange.startDate);
  const [customEnd, setCustomEnd] = useState(currentRange.endDate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (preset: DateRangePreset) => {
    if (preset === 'CUSTOM') {
      const newRange = resolveDateRange('CUSTOM', customStart, customEnd);
      onRangeChange(newRange);
      setIsOpen(false);
      return;
    }

    const newRange = resolveDateRange(preset);
    onRangeChange(newRange);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      const newRange = resolveDateRange('CUSTOM', customStart, customEnd);
      onRangeChange(newRange);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        data-testid="daterange-picker-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-default hover:border-border-strong text-sm font-medium text-foreground transition-all shadow-xs"
      >
        <Calendar size={16} className="text-primary" />
        <span>{currentRange.label}</span>
        <ChevronDown size={14} className={`text-content4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-surface-raised border border-border-default rounded-2xl shadow-2xl z-50 p-2 animate-fadeIn">
          <div className="text-[11px] font-semibold text-content4 uppercase tracking-wider px-3 py-1.5">
            Rango de fechas
          </div>

          <div className="space-y-0.5">
            {PRESETS.map((p) => {
              const isSelected = currentRange.preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-content4/10'
                  }`}
                >
                  <span>{p.label}</span>
                  {isSelected && <Check size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs if selected */}
          {currentRange.preset === 'CUSTOM' && (
            <div className="mt-2 pt-2 border-t border-divider space-y-2 px-2">
              <div className="text-[11px] font-medium text-content3">Rango personalizado</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-content4 block mb-0.5">Desde</label>
                  <DatePicker
                    value={customStart}
                    onChange={(val) => setCustomStart(val)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-content4 block mb-0.5">Hasta</label>
                  <DatePicker
                    value={customEnd}
                    onChange={(val) => setCustomEnd(val)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="w-full mt-2 py-1.5 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Aplicar fechas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
