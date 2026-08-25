import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, Plus } from 'lucide-react';
import { Category } from '../../../domain/catalog/Category';

export interface CategoryAutocompleteProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onCreateCategoryClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const CategoryAutocomplete: React.FC<CategoryAutocompleteProps> = ({
  categories,
  value,
  onChange,
  onCreateCategoryClick,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCategory = useMemo(() => {
    if (!value) return null;
    return categories.find((c) => c.id === value) || null;
  }, [categories, value]);

  // Filtered list
  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
    );
  }, [categories, searchTerm]);

  // Options list: "Sin categoría" (index 0) + filtered categories (index 1..n)
  const allOptions = useMemo(() => {
    return [
      { id: null, name: 'Sin categoría asignada', color: null, isNone: true },
      ...filteredCategories.map((c) => ({ id: c.id, name: c.name, color: c.color, isNone: false })),
    ];
  }, [filteredCategories]);

  // Close when clicking outside
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

  const openDropdown = () => {
    setSearchTerm('');
    setActiveIndex(-1);
    setIsOpen(true);
  };

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= allOptions.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? allOptions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < allOptions.length) {
        const option = allOptions[activeIndex];
        onChange(option.id);
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelect = (categoryId: string | null) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {/* Header with Label and "+ Crear categoría" action */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Categoría
        </label>
        {onCreateCategoryClick && (
          <button
            type="button"
            onClick={onCreateCategoryClick}
            className="text-xs font-semibold text-brand-primary hover:text-brand-hover flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary rounded"
          >
            <Plus size={13} />
            <span>Crear categoría</span>
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              setIsOpen(false);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Seleccionar categoría"
          className={`w-full px-3.5 py-2.5 bg-surface-secondary border rounded-xl text-left text-sm font-medium transition-all duration-150 flex items-center justify-between gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/40 ${
            isOpen
              ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-surface-hover'
              : 'border-border-default hover:border-border-strong hover:bg-surface-hover'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedCategory ? (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedCategory.color || '#3B82F6' }}
                />
                <span className="text-text-primary font-semibold truncate">
                  {selectedCategory.name}
                </span>
              </>
            ) : (
              <span className="text-text-tertiary">Sin categoría asignada</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedCategory && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-full hover:bg-surface-secondary transition-colors cursor-pointer"
                title="Quitar categoría"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown
              size={16}
              className={`text-text-tertiary transition-transform duration-150 ${
                isOpen ? 'rotate-180 text-brand-primary' : ''
              }`}
            />
          </div>
        </button>

        {/* Searchable Popover Menu */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 z-50 mt-1.5 bg-surface-raised border border-border-default rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ minWidth: '240px' }}
          >
            {/* Popover Search Field */}
            <div className="p-2 border-b border-border-default/70 bg-surface-secondary/40">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-text-tertiary pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar categoría..."
                  className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border-default rounded-lg text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>

            {/* ListBox Items */}
            <div
              ref={listRef}
              role="listbox"
              aria-label="Categorías disponibles"
              className="max-h-56 overflow-y-auto p-1 space-y-0.5"
            >
              {allOptions.map((opt, idx) => {
                const isSelected = opt.id === value;
                const isHighlighted = activeIndex === idx;

                return (
                  <button
                    key={opt.id || 'none'}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.id)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors cursor-pointer flex items-center justify-between text-left ${
                      isSelected
                        ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                        : isHighlighted
                        ? 'bg-surface-hover text-text-primary'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {opt.color ? (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                      ) : opt.isNone ? (
                        <span className="w-2.5 h-2.5 rounded-full border border-dashed border-text-tertiary shrink-0" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0" />
                      )}
                      <span className="truncate">{opt.name}</span>
                    </div>

                    {isSelected && (
                      <Check size={15} className="text-brand-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {allOptions.length === 1 && searchTerm && (
                <div className="py-4 text-center text-xs text-text-tertiary">
                  No se encontraron categorías para &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
