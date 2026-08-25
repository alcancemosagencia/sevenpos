import React from 'react';
import { Search, X, Barcode, Filter, RotateCcw } from 'lucide-react';
import { Category } from '../../../domain/catalog/Category';
import { Select, SelectOption } from '../../../components/ui/Select';
import { FilterToolbar } from '../../../components/ui/FilterToolbar';

interface ProductSearchFiltersProps {
  query: string;
  onQueryChange: (q: string) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  status: 'all' | 'active' | 'inactive';
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  hasPresentations: boolean | undefined;
  onHasPresentationsChange: (has: boolean | undefined) => void;
  categories: Category[];
  onResetFilters: () => void;
}

export const ProductSearchFilters: React.FC<ProductSearchFiltersProps> = ({
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  hasPresentations,
  onHasPresentationsChange,
  categories,
  onResetFilters,
}) => {
  const isFiltered = Boolean(query || categoryId || status !== 'all' || hasPresentations !== undefined);

  // Category options
  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    { value: 'uncategorized', label: 'Sin categoría' },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.name}${!c.active ? ' (Inactiva)' : ''}`,
      color: c.color,
    })),
  ];

  // Status options
  const statusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Solo activos' },
    { value: 'inactive', label: 'Solo inactivos' },
  ];

  // Presentations options
  const presentationOptions: SelectOption[] = [
    { value: 'all', label: 'Presentaciones: Todas' },
    { value: 'with', label: 'Con presentaciones' },
    { value: 'without', label: 'Sin presentaciones' },
  ];

  const currentPresentationValue =
    hasPresentations === undefined ? 'all' : hasPresentations ? 'with' : 'without';

  return (
    <FilterToolbar className="mb-4">
      {/* Search input with barcode icon */}
      <div className="relative flex-1 min-w-[240px]">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por nombre, SKU o código de barras..."
          className="w-full pl-10 pr-20 py-2.5 bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-brand-primary transition-colors shadow-xs"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="p-1 text-text-tertiary hover:text-text-primary rounded-lg"
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
          <div
            className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-surface-secondary border border-border-default text-[10px] font-mono text-text-tertiary"
            title="Lector de código de barras listo"
          >
            <Barcode size={12} />
            <span>SCAN</span>
          </div>
        </div>
      </div>

      {/* Filters Group with HeroUI Selects */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Select */}
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={onCategoryChange}
          icon={<Filter size={14} />}
          className="min-w-[160px] flex-1 sm:flex-initial"
          popoverClassName="w-56"
        />

        {/* Status Filter */}
        <Select
          options={statusOptions}
          value={status}
          onChange={(val) => onStatusChange(val as 'all' | 'active' | 'inactive')}
          className="min-w-[140px]"
        />

        {/* Presentations Filter */}
        <Select
          options={presentationOptions}
          value={currentPresentationValue}
          onChange={(val) => {
            if (val === 'all') onHasPresentationsChange(undefined);
            else if (val === 'with') onHasPresentationsChange(true);
            else onHasPresentationsChange(false);
          }}
          className="min-w-[170px]"
        />

        {/* Clear Filters Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-2 text-xs font-medium text-text-secondary hover:text-brand-primary hover:bg-surface-secondary rounded-xl border border-border-default transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Restablecer todos los filtros"
          >
            <RotateCcw size={13} />
            <span>Limpiar</span>
          </button>
        )}
      </div>
    </FilterToolbar>
  );
};
