import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = 'Buscar...', className = '', ...props }, ref) => {
    const hasValue = value !== undefined && value !== '';

    return (
      <div className={`relative flex items-center w-full min-w-[180px] max-w-[320px] ${className}`}>
        <span className="absolute left-3 text-text-tertiary pointer-events-none flex items-center justify-center">
          <Search size={15} strokeWidth={2.2} />
        </span>
        <input
          type="text"
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-surface-secondary text-text-primary placeholder:text-text-tertiary border border-border-default rounded-full text-xs sm:text-sm pl-9 pr-8 py-1.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary focus:bg-surface hover:border-border-strong"
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 text-text-tertiary hover:text-text-primary p-0.5 rounded-full transition-colors cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
