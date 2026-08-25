import React from 'react';
import { Category } from '../../../domain/catalog/Category';
import { Sparkles, LayoutGrid } from 'lucide-react';

interface PosCategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedFilterType: 'ALL' | 'FEATURED' | 'CATEGORY';
  onSelectAll: () => void;
  onSelectFeatured: () => void;
  onSelectCategory: (categoryId: string) => void;
}

export const PosCategoryFilter: React.FC<PosCategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  selectedFilterType,
  onSelectAll,
  onSelectFeatured,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {/* Todos */}
      <button
        type="button"
        onClick={onSelectAll}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
          selectedFilterType === 'ALL'
            ? 'bg-text-primary text-background border-text-primary shadow-xs'
            : 'bg-surface border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-hover'
        }`}
      >
        <LayoutGrid size={14} />
        <span>Todos</span>
      </button>

      {/* Destacados */}
      <button
        type="button"
        onClick={onSelectFeatured}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
          selectedFilterType === 'FEATURED'
            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
            : 'bg-surface border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-hover'
        }`}
      >
        <Sparkles size={14} />
        <span>Destacados</span>
      </button>

      {/* Categories */}
      {categories.map((cat) => {
        const isSelected = selectedFilterType === 'CATEGORY' && selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
              isSelected
                ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                : 'bg-surface border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {cat.color && (
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: cat.color }}
              />
            )}
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
