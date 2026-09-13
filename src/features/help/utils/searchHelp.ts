import { HelpArticle, FaqItem, HelpCategory } from '../types';

/**
 * Normalize string removing accents, diacritics and converting to lower case.
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface SearchHelpResult {
  articles: HelpArticle[];
  faqs: FaqItem[];
  categories: HelpCategory[];
}

export function searchHelp(
  query: string,
  articles: HelpArticle[],
  faqs: FaqItem[],
  categories: HelpCategory[]
): SearchHelpResult {
  const normQuery = normalizeSearchString(query);
  if (!normQuery) {
    return {
      articles,
      faqs,
      categories,
    };
  }

  const queryTerms = normQuery.split(/\s+/).filter(Boolean);

  const matchedArticles = articles.filter((article) => {
    const titleNorm = normalizeSearchString(article.title);
    const descNorm = normalizeSearchString(article.description);
    const tagsNorm = article.tags.map(normalizeSearchString).join(' ');
    const stepsNorm = article.steps
      .map((s) => normalizeSearchString(`${s.title} ${s.content} ${s.tip || ''}`))
      .join(' ');

    const fullArticleContent = `${titleNorm} ${descNorm} ${tagsNorm} ${stepsNorm}`;
    return queryTerms.every((term) => fullArticleContent.includes(term));
  });

  const matchedFaqs = faqs.filter((faq) => {
    const questionNorm = normalizeSearchString(faq.question);
    const answerNorm = normalizeSearchString(faq.answer);
    const fullFaqContent = `${questionNorm} ${answerNorm}`;
    return queryTerms.every((term) => fullFaqContent.includes(term));
  });

  const matchedCategories = categories.filter((cat) => {
    const nameNorm = normalizeSearchString(cat.name);
    const descNorm = normalizeSearchString(cat.description);
    const fullCatContent = `${nameNorm} ${descNorm}`;
    return queryTerms.some((term) => fullCatContent.includes(term));
  });

  return {
    articles: matchedArticles,
    faqs: matchedFaqs,
    categories: matchedCategories,
  };
}
