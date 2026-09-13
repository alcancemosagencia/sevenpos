import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/shell/PageHeader';
import { PageContainer } from '../components/shell/PageContainer';
import { HELP_CATEGORIES } from '../features/help/data/categories';
import { HELP_ARTICLES } from '../features/help/data/articles';
import { HELP_FAQS } from '../features/help/data/faqs';
import { searchHelp } from '../features/help/utils/searchHelp';
import { HelpSearchBar } from '../features/help/components/HelpSearchBar';
import { HelpQuickActions } from '../features/help/components/HelpQuickActions';
import { HelpCategoryGrid } from '../features/help/components/HelpCategoryGrid';
import { HelpArticleView } from '../features/help/components/HelpArticleView';
import { HelpFaqAccordion } from '../features/help/components/HelpFaqAccordion';
import { HelpSupportSection } from '../features/help/components/HelpSupportSection';
import { HelpArticle, HelpCategory } from '../features/help/types';
import { ArrowLeft, BookOpen, HelpCircle, ChevronRight, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface HelpPageProps {
  onNavigateToPos?: () => void;
  onNavigateToSettings?: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  onNavigateToPos,
  onNavigateToSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Filtered / Search results
  const searchResults = useMemo(() => {
    return searchHelp(searchQuery, HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
  }, [searchQuery]);

  const activeCategory = useMemo<HelpCategory | undefined>(() => {
    if (!selectedCategoryId) return undefined;
    return HELP_CATEGORIES.find((c) => c.id === selectedCategoryId);
  }, [selectedCategoryId]);

  const activeArticle = useMemo<HelpArticle | undefined>(() => {
    if (!selectedArticleId) return undefined;
    return HELP_ARTICLES.find((a) => a.id === selectedArticleId);
  }, [selectedArticleId]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedArticleId(null);
  };

  const handleSelectArticle = (artId: string) => {
    setSelectedArticleId(artId);
  };

  const handleBackToHome = () => {
    setSelectedCategoryId(null);
    setSelectedArticleId(null);
  };

  const handleBackToCategory = () => {
    setSelectedArticleId(null);
  };

  const handleSelectShortcuts = () => {
    const shortcutsArticle = HELP_ARTICLES.find((a) => a.id === 'art-pos-1' || a.categoryId === 'punto-de-venta');
    if (shortcutsArticle) {
      setSelectedCategoryId(shortcutsArticle.categoryId);
      setSelectedArticleId(shortcutsArticle.id);
    }
  };

  const scrollToSupport = () => {
    const elem = document.getElementById('soporte-contacto');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  // 1. Article View Mode
  if (activeArticle) {
    return (
      <PageContainer>
        <PageHeader
          title="Centro de Ayuda"
          subtitle="Guías, atajos y asistencia técnica para operar SevenPOS."
        />
        <HelpArticleView
          article={activeArticle}
          category={activeCategory || HELP_CATEGORIES.find((c) => c.id === activeArticle.categoryId)}
          allArticles={HELP_ARTICLES}
          onBack={selectedCategoryId ? handleBackToCategory : handleBackToHome}
          onSelectArticle={handleSelectArticle}
        />
        <div className="pt-8">
          <HelpSupportSection />
        </div>
      </PageContainer>
    );
  }

  // 2. Category Detail Mode (List of articles inside selected category)
  if (activeCategory && !isSearching) {
    const categoryArticles = HELP_ARTICLES.filter((a) => a.categoryId === activeCategory.id);
    const categoryFaqs = HELP_FAQS.filter((f) => f.categoryId === activeCategory.id);

    return (
      <PageContainer>
        <PageHeader
          title={activeCategory.name}
          subtitle={activeCategory.description}
          actions={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft size={16} />}
              onClick={handleBackToHome}
            >
              Todas las categorías
            </Button>
          }
        />

        <div className="space-y-6">
          <HelpSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Articles list */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <BookOpen size={18} className="text-brand-primary" />
              Guías y artículos en {activeCategory.name} ({categoryArticles.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {categoryArticles.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => handleSelectArticle(art.id)}
                  className="group p-4 bg-surface rounded-2xl border border-border-default hover:border-brand-primary/50 text-left transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">
                        {activeCategory.name}
                      </span>
                      <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                        <Clock size={12} />
                        {art.readTimeMinutes} min
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                      {art.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-semibold text-brand-primary">
                    <span>Leer guía</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category FAQs if any */}
          {categoryFaqs.length > 0 && (
            <div className="space-y-3 pt-4">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <HelpCircle size={18} className="text-brand-primary" />
                Preguntas frecuentes de {activeCategory.name}
              </h2>
              <HelpFaqAccordion faqs={categoryFaqs} />
            </div>
          )}

          <div className="pt-6">
            <HelpSupportSection />
          </div>
        </div>
      </PageContainer>
    );
  }

  // 3. Search Active Mode
  if (isSearching) {
    const totalCount = searchResults.articles.length + searchResults.faqs.length;

    return (
      <PageContainer>
        <PageHeader
          title="Centro de Ayuda"
          subtitle="Resultados de búsqueda instantánea."
        />

        <div className="space-y-6">
          <HelpSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={totalCount}
            isSearching={true}
          />

          {totalCount === 0 ? (
            <div className="text-center py-12 p-6 bg-surface rounded-3xl border border-border-default space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-secondary text-text-tertiary flex items-center justify-center mx-auto">
                <HelpCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                No se encontraron artículos para "{searchQuery}"
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Intenta con palabras clave más generales como "venta", "stock", "PIN", "caja", o contáctanos directamente.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                Ver todas las guías
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Matched Articles */}
              {searchResults.articles.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
                    Artículos ({searchResults.articles.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {searchResults.articles.map((art) => {
                      const cat = HELP_CATEGORIES.find((c) => c.id === art.categoryId);
                      return (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => handleSelectArticle(art.id)}
                          className="group p-4 bg-surface rounded-2xl border border-border-default hover:border-brand-primary/50 text-left transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                                {cat?.name || 'Guía'}
                              </span>
                              <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                                <Clock size={12} />
                                {art.readTimeMinutes} min
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                              {art.title}
                            </h3>
                            <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                              {art.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-semibold text-brand-primary">
                            <span>Leer artículo</span>
                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched FAQs */}
              {searchResults.faqs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
                    Preguntas Frecuentes ({searchResults.faqs.length})
                  </h2>
                  <HelpFaqAccordion faqs={searchResults.faqs} />
                </div>
              )}
            </div>
          )}

          <div className="pt-6">
            <HelpSupportSection />
          </div>
        </div>
      </PageContainer>
    );
  }

  // 4. Default Home Overview Mode
  return (
    <PageContainer>
      <PageHeader
        title="Centro de Ayuda"
        subtitle="Guías paso a paso, atajos de teclado y respuestas a preguntas frecuentes."
      />

      <div className="space-y-8">
        {/* Search Bar */}
        <HelpSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Quick Actions (4 cards) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-wider">
            Accesos Rápidos
          </h2>
          <HelpQuickActions
            onSelectShortcuts={handleSelectShortcuts}
            onNavigateSettings={onNavigateToSettings}
            onNavigatePos={onNavigateToPos}
            onScrollToSupport={scrollToSupport}
          />
        </div>

        {/* Categories Grid (13 categories) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-wider">
              Explorar por Categoría ({HELP_CATEGORIES.length})
            </h2>
          </div>
          <HelpCategoryGrid
            categories={HELP_CATEGORIES}
            articles={HELP_ARTICLES}
            onSelectCategory={handleSelectCategory}
          />
        </div>

        {/* FAQs Accordion (12 FAQs) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-wider">
              Preguntas Frecuentes ({HELP_FAQS.length})
            </h2>
          </div>
          <HelpFaqAccordion faqs={HELP_FAQS} />
        </div>

        {/* Support and Contact Section */}
        <div className="pt-4">
          <HelpSupportSection />
        </div>
      </div>
    </PageContainer>
  );
};
