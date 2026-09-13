import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HelpPage } from '../pages/HelpPage';
import { HELP_CATEGORIES } from '../features/help/data/categories';
import { HELP_ARTICLES } from '../features/help/data/articles';
import { HELP_FAQS } from '../features/help/data/faqs';
import { searchHelp, normalizeSearchString } from '../features/help/utils/searchHelp';

describe('AG-14: Help Center (/help) Full Verification', () => {
  it('has exactly 13 canonical help categories matching real product modules', () => {
    expect(HELP_CATEGORIES.length).toBe(13);
    const categoryIds = HELP_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toEqual([
      'primeros-pasos',
      'punto-de-venta',
      'ventas',
      'catalogo',
      'inventario',
      'compras',
      'caja-finanzas',
      'clientes',
      'reportes',
      'auditoria',
      'configuracion',
      'usuarios-permisos',
      'suscripcion-planes',
    ]);
  });

  it('has exactly 30 non-technical, user-focused help articles', () => {
    expect(HELP_ARTICLES.length).toBe(30);
    HELP_ARTICLES.forEach((article) => {
      expect(article.id).toBeDefined();
      expect(article.title).toBeTruthy();
      expect(article.description).toBeTruthy();
      expect(article.steps.length).toBeGreaterThan(0);
      expect(article.readTimeMinutes).toBeGreaterThan(0);
    });
  });

  it('contains 0 technical internal terms in customer-facing content', () => {
    const forbiddenTerms = [
      'sqlite',
      'tauri',
      'supabase',
      'stronghold',
      'repository',
      'migration',
      'local-first',
      'rbac',
      'webcrypto',
      'app_meta',
      'schema',
      'database engine',
    ];

    const allContent = [
      ...HELP_CATEGORIES.map((c) => `${c.name} ${c.description}`),
      ...HELP_ARTICLES.map((a) => `${a.title} ${a.description} ${a.tags.join(' ')} ${a.steps.map((s) => `${s.title} ${s.content} ${s.tip || ''}`).join(' ')}`),
      ...HELP_FAQS.map((f) => `${f.question} ${f.answer}`),
    ].join(' ').toLowerCase();

    forbiddenTerms.forEach((term) => {
      expect(allContent.includes(term)).toBe(false);
    });
  });

  it('has 12 practical FAQs covering key business and operational aspects', () => {
    expect(HELP_FAQS.length).toBe(12);
    HELP_FAQS.forEach((faq) => {
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
      expect(faq.categoryId).toBeTruthy();
    });
  });

  it('performs accent-insensitive, case-insensitive instant search correctly across key terms', () => {
    expect(normalizeSearchString('Configuración')).toBe('configuracion');
    expect(normalizeSearchString('DUEÑO')).toBe('dueno');

    // Search: venta
    const resVenta = searchHelp('venta', HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
    expect(resVenta.articles.length).toBeGreaterThan(0);

    // Search: impresora
    const resImpresora = searchHelp('impresora', HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
    expect(resImpresora.articles.length).toBeGreaterThan(0);

    // Search: usuarios
    const resUsuarios = searchHelp('usuarios', HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
    expect(resUsuarios.articles.length).toBeGreaterThan(0);

    // Search: internet
    const resInternet = searchHelp('internet', HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
    expect(resInternet.faqs.length).toBeGreaterThan(0);

    // Search: PIN
    const resPin = searchHelp('PIN', HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
    expect(resPin.articles.length).toBeGreaterThan(0);

    // Search: reportes
    const resReportes = searchHelp('reportes', HELP_ARTICLES, HELP_FAQS, HELP_CATEGORIES);
    expect(resReportes.articles.length).toBeGreaterThan(0);
  });

  it('renders HelpPage with search bar, quick actions, categories, FAQs, and support section', () => {
    const html = renderToString(<HelpPage />);

    expect(html).toContain('Centro de Ayuda');
    expect(html).toContain('Buscar artículos, atajos, dudas o guías');
    expect(html).toContain('Atajos de teclado');
    expect(html).toContain('Primeros pasos');
    expect(html).toContain('Punto de venta');
    expect(html).toContain('Preguntas Frecuentes');
    expect(html).toContain('Canales de soporte directo próximamente disponibles');
    // Ensure no fake support channels or fake IDs are rendered
    expect(html).not.toContain('soporte@sevenpos.pro');
    expect(html).not.toContain('SPOS-COMMUNITY-2026');
  });
});
