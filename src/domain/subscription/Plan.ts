export type PlanCode = 'FREE' | 'PRO';

export type EntitlementKey =
  | 'reports.full_history'
  | 'audit.full_history'
  | 'analytics.advanced'
  | 'analytics.comparisons'
  | 'exports.full_history'
  | 'users.multi';

export type LimitKey =
  | 'catalog.active_products'
  | 'customers.active'
  | 'users.active_operators';

export type MetricKey = 'sales.monthly_completed';

export type RoadmapFeatureKey =
  | 'images.ai_background_removal'
  | 'storefront.online'
  | 'tax.sii_chile'
  | 'automation.workflows'
  | 'sync.cloud'
  | 'branches.multi';

export interface PlanLimits {
  activeProducts: number;
  activeCustomers: number;
  activeUsers: number;
  reportsHistoryDays: number | 'FULL';
  auditHistoryDays: number | 'FULL';
}

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  badgeLabel: string;
  tagline: string;
  description: string;
  priceFormatted: string;
  billingInterval: string;
  ctaLabel: string;
  isPopular?: boolean;
  limits: PlanLimits;
  entitlements: EntitlementKey[];
}

/**
 * Internal safety ceilings for Pro to guard against runaway abuse or hardware overload.
 * NOT surfaced to customers as commercial plan quotas.
 */
export const PRO_INTERNAL_SAFETY_CEILINGS: Record<LimitKey, number> = {
  'catalog.active_products': 5000,
  'customers.active': 2000,
  'users.active_operators': 5,
};

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  FREE: {
    code: 'FREE',
    name: 'SevenPOS Free',
    badgeLabel: 'Plan Actual',
    tagline: 'Todo lo necesario para empezar',
    description: 'Todo lo necesario para empezar a operar tu negocio.',
    priceFormatted: '$0',
    billingInterval: 'para siempre',
    ctaLabel: 'Plan actual',
    limits: {
      activeProducts: 100,
      activeCustomers: 50,
      activeUsers: 1,
      reportsHistoryDays: 7,
      auditHistoryDays: 3,
    },
    entitlements: [],
  },
  PRO: {
    code: 'PRO',
    name: 'SevenPOS Pro',
    badgeLabel: 'Recomendado',
    tagline: 'SevenPOS empieza a trabajar por ti',
    description: 'Más control, equipo e inteligencia para hacer crecer tu negocio.',
    priceFormatted: 'Precio próximamente',
    billingInterval: 'suscripción mensual o anual',
    ctaLabel: 'Quiero conocer Pro',
    isPopular: true,
    limits: {
      activeProducts: Infinity, // Commercial UI is unlimited
      activeCustomers: Infinity, // Commercial UI is unlimited
      activeUsers: 5,
      reportsHistoryDays: 'FULL',
      auditHistoryDays: 'FULL',
    },
    entitlements: [
      'reports.full_history',
      'audit.full_history',
      'analytics.advanced',
      'analytics.comparisons',
      'exports.full_history',
      'users.multi',
    ],
  },
};

export interface RoadmapFeatureDefinition {
  key: RoadmapFeatureKey;
  title: string;
  status: 'COMING_SOON';
  isAvailable: false;
}

export const ROADMAP_FEATURES: RoadmapFeatureDefinition[] = [
  {
    key: 'images.ai_background_removal',
    title: 'Mejora automática de imágenes con IA',
    status: 'COMING_SOON',
    isAvailable: false,
  },
  {
    key: 'storefront.online',
    title: 'Tienda online pública',
    status: 'COMING_SOON',
    isAvailable: false,
  },
  {
    key: 'tax.sii_chile',
    title: 'Facturación electrónica SII (Chile)',
    status: 'COMING_SOON',
    isAvailable: false,
  },
  {
    key: 'automation.workflows',
    title: 'Automatizaciones de inventario',
    status: 'COMING_SOON',
    isAvailable: false,
  },
  {
    key: 'sync.cloud',
    title: 'Sincronización en la nube multi-sucursal',
    status: 'COMING_SOON',
    isAvailable: false,
  },
  {
    key: 'branches.multi',
    title: 'Multisucursal y Bodegas',
    status: 'COMING_SOON',
    isAvailable: false,
  },
];
