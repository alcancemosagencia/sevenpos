import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  color?: string | null;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  buttonClassName?: string;
  popoverClassName?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  icon,
  align = 'left',
  className = '',
  buttonClassName = '',
  popoverClassName = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || (placeholder ? null : options[0]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        const idx = options.findIndex((opt) => opt.value === value);
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= options.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? options.length - 1 : prev - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < options.length) {
        onChange(options[activeIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            const idx = options.findIndex((opt) => opt.value === value);
            setActiveIndex(idx >= 0 ? idx : 0);
          }
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-between gap-2 bg-surface-secondary text-text-primary text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border border-border-default hover:border-border-strong hover:bg-surface-hover transition-all duration-150 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/40 ${
          isOpen ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-surface-hover' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-text-tertiary shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-1.5 min-w-0">
              {selectedOption.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )}
              <span className="truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-text-tertiary truncate">{placeholder || 'Seleccionar...'}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-text-tertiary transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 mt-1.5 min-w-[180px] max-h-64 overflow-y-auto bg-surface-raised border border-border-default rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] p-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 space-y-0.5 ${popoverClassName}`}
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isHighlighted = activeIndex === idx;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full text-left px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                    : isHighlighted
                    ? 'bg-surface-hover text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {option.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-brand-primary shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
