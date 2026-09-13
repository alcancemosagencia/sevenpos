export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  order: number;
}

export interface ArticleStep {
  stepNumber: number;
  title: string;
  content: string;
  tip?: string;
}

export interface HelpArticle {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  tags: string[];
  steps: ArticleStep[];
  relatedArticleIds?: string[];
  isFeatured?: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
}

export type HelpViewMode = 'home' | 'category' | 'article' | 'search';
