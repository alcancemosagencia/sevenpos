import React from 'react';
import {
  Rocket,
  Store,
  Receipt,
  Layers,
  Boxes,
  Truck,
  Wallet,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  LucideIcon,
  ChevronRight,
} from 'lucide-react';
import { HelpCategory, HelpArticle } from '../types';

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  Store,
  Receipt,
  Layers,
  Boxes,
  Truck,
  Wallet,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  ShieldAlert,
  Sparkles,
  HelpCircle,
};

export interface HelpCategoryGridProps {
  categories: HelpCategory[];
  articles: HelpArticle[];
  onSelectCategory: (categoryId: string) => void;
}

export const HelpCategoryGrid: React.FC<HelpCategoryGridProps> = ({
  categories,
  articles,
  onSelectCategory,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {categories.map((cat) => {
        const IconComponent = ICON_MAP[cat.iconName] || HelpCircle;
        const categoryArticles = articles.filter((a) => a.categoryId === cat.id);
        const articleCount = categoryArticles.length;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className="group p-4 bg-surface rounded-2xl border border-border-default hover:border-brand-primary/50 hover:shadow-md transition-all text-left cursor-pointer flex flex-col justify-between active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-surface-secondary text-brand-primary flex items-center justify-center border border-border-default group-hover:bg-brand-primary/10 transition-colors">
                  <IconComponent size={20} />
                </div>
                <span className="text-[11px] font-semibold text-text-tertiary px-2 py-0.5 rounded-full bg-surface-secondary border border-border-default">
                  {articleCount} {articleCount === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                {cat.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-medium text-text-secondary group-hover:text-brand-primary transition-colors">
              <span>Ver guías</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
