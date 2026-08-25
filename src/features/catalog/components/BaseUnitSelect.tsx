import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Scale } from 'lucide-react';
import { BaseUnitCode, BASE_UNITS } from '../../../domain/common/unit/BaseUnit';

export interface BaseUnitSelectProps {
  value: BaseUnitCode;
  onChange: (unit: BaseUnitCode) => void;
  disabled?: boolean;
  className?: string;
}

export const BaseUnitSelect: React.FC<BaseUnitSelectProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUnit = BASE_UNITS.find((u) => u.code === value) || BASE_UNITS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const idx = BASE_UNITS.findIndex((u) => u.code === value);
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= BASE_UNITS.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? BASE_UNITS.length - 1 : prev - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < BASE_UNITS.length) {
        onChange(BASE_UNITS[activeIndex].code);
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Unidad base de medida
      </label>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const nextOpen = !isOpen;
            setIsOpen(nextOpen);
            if (nextOpen) {
              const idx = BASE_UNITS.findIndex((u) => u.code === value);
              setActiveIndex(idx >= 0 ? idx : 0);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Seleccionar unidad base de medida"
          className={`w-full px-3.5 py-2.5 bg-surface-secondary border rounded-xl text-left text-sm font-medium transition-all duration-150 flex items-center justify-between gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/40 ${
            isOpen
              ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-surface-hover'
              : 'border-border-default hover:border-border-strong hover:bg-surface-hover'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Scale size={15} className="text-text-tertiary shrink-0" />
            <span className="text-text-primary font-semibold truncate">
              {selectedUnit.label}
            </span>
          </div>

          <ChevronDown
            size={16}
            className={`text-text-tertiary transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-brand-primary' : ''
            }`}
          />
        </button>

        {/* Popover Menu */}
        {isOpen && (
          <div
            role="listbox"
            aria-label="Unidades de medida"
            className="absolute left-0 right-0 z-50 mt-1.5 bg-surface-raised border border-border-default rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] p-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 space-y-0.5"
          >
            {BASE_UNITS.map((u, idx) => {
              const isSelected = u.code === value;
              const isHighlighted = activeIndex === idx;

              return (
                <button
                  key={u.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(u.code);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors cursor-pointer flex items-center justify-between text-left ${
                    isSelected
                      ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                      : isHighlighted
                      ? 'bg-surface-hover text-text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{u.label}</span>
                  </div>

                  {isSelected && (
                    <Check size={15} className="text-brand-primary shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
