import React from 'react';
import { Search, X } from 'lucide-react';

export interface HelpSearchBarProps {
  value: string;
  onChange: (query: string) => void;
  resultCount?: number;
  isSearching?: boolean;
}

export const HelpSearchBar: React.FC<HelpSearchBarProps> = ({
  value,
  onChange,
  resultCount,
  isSearching = false,
}) => {
  return (
    <div className="w-full relative">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-text-tertiary pointer-events-none flex items-center justify-center">
          <Search size={20} />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar artículos, atajos, dudas o guías (ej: cobrar, F2, backup, PIN)..."
          className="w-full pl-12 pr-12 py-3.5 bg-surface border border-border-default hover:border-border-strong focus:border-brand-primary rounded-2xl text-sm sm:text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 shadow-xs transition-all"
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Borrar búsqueda"
            className="absolute right-3.5 p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="mt-2 px-2 flex items-center justify-between text-xs text-text-tertiary">
          <span>
            {resultCount !== undefined
              ? `${resultCount} ${resultCount === 1 ? 'resultado encontrado' : 'resultados encontrados'}`
              : 'Buscando...'}
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-brand-primary hover:underline cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}
    </div>
  );
};
