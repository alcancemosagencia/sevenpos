import React from 'react';
import { ArrowLeft, Clock, Lightbulb, Tag, CheckCircle2, ChevronRight } from 'lucide-react';
import { HelpArticle, HelpCategory } from '../types';
import { Button } from '../../../components/ui/Button';

export interface HelpArticleViewProps {
  article: HelpArticle;
  category?: HelpCategory;
  allArticles: HelpArticle[];
  onBack: () => void;
  onSelectArticle: (articleId: string) => void;
}

export const HelpArticleView: React.FC<HelpArticleViewProps> = ({
  article,
  category,
  allArticles,
  onBack,
  onSelectArticle,
}) => {
  const relatedArticles = (article.relatedArticleIds || [])
    .map((id) => allArticles.find((a) => a.id === id))
    .filter((a): a is HelpArticle => Boolean(a));

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-0 duration-150">
      {/* Top Bar with Back Button and Category info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border-default">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          {category ? `Volver a ${category.name}` : 'Volver al Centro de Ayuda'}
        </Button>

        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {category && (
            <span className="font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full border border-brand-primary/20">
              {category.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {article.readTimeMinutes} min de lectura
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary tracking-tight">
          {article.title}
        </h1>
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
          {article.description}
        </p>
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Tag size={13} className="text-text-tertiary mr-1" />
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-secondary text-text-tertiary border border-border-default"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Step by Step Guide */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
          <CheckCircle2 size={18} className="text-brand-primary" />
          Paso a paso para completar esta acción
        </h2>

        <div className="space-y-4">
          {article.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="p-4 sm:p-5 bg-surface rounded-2xl border border-border-default space-y-2.5 shadow-xs"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-brand-primary text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {step.stepNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                    {step.content}
                  </p>
                </div>
              </div>

              {step.tip && (
                <div className="mt-3 ml-10 p-3 rounded-xl bg-brand-primary/5 border border-brand-primary/20 text-xs text-text-primary flex items-start gap-2.5">
                  <Lightbulb size={16} className="text-brand-primary shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold text-brand-primary">Consejo práctico: </strong>
                    {step.tip}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="pt-6 border-t border-border-default space-y-3">
          <h3 className="text-sm font-bold text-text-primary">
            Artículos relacionados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedArticles.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => onSelectArticle(rel.id)}
                className="group p-3.5 bg-surface rounded-xl border border-border-default hover:border-brand-primary/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs sm:text-sm font-semibold text-text-primary group-hover:text-brand-primary truncate transition-colors">
                    {rel.title}
                  </p>
                  <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5">
                    {rel.description}
                  </p>
                </div>
                <ChevronRight size={16} className="text-text-tertiary group-hover:text-brand-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
