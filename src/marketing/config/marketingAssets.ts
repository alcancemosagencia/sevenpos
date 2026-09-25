/** Single source of image URLs used by the marketing site. */
export const marketingAssets = {
  hero: {
    terminal: '/marketing/hero/sevenpos-cafe-terminal.png',
    logo: '/marketing/hero/sevenpos-logo-horizontal.png',
  },
  brand: {
  mark: "/marketing/brand/sevenpos-mark.png",
},
  product: {
    terminal: '/marketing/product/sevenpos-cafe-terminal.png',
    inventory: '/marketing/product/sevenpos-stock-realtime.png',
    reports: '/marketing/product/sevenpos-reports-terminal.png',
  },
  priorities: {
    selling: '/marketing/priorities/sevenpos-multidevice.png',
    management: '/marketing/priorities/sevenpos-team-permissions.png',
    reports: '/marketing/priorities/sevenpos-reports-terminal.png',
  },
  businesses: {
    minimarkets: '/marketing/businesses/business-showcase.png',
    restaurants: '/marketing/businesses/sevenpos-restaurante-terminal.png',
    cafes: '/marketing/businesses/sevenpos-cafe-terminal.png',
    retail: '/marketing/businesses/sevenpos-stock-realtime.png',
    services: '/marketing/businesses/sevenpos-multidevice.png',
  },
  workflow: {
  saleToControl: "/marketing/workflow/sale-to-control.webp",
},
  finalCta: {
    devices: '/marketing/final-cta/sevenpos-multidevice.png',
  },
} as const;

export type MarketingBusiness = {
  id: 'minimarkets' | 'restaurantes' | 'cafeterias' | 'retail' | 'servicios';
  label: string;
  image: string;
  title: string;
  description: string;
  alt: string;
  composite: boolean;
};

export const marketingBusinesses: readonly MarketingBusiness[] = [
  {
    id: 'minimarkets',
    label: 'Minimarkets',
    image: marketingAssets.businesses.minimarkets,
    title: 'Minimarket',
    description: 'Ventas más rápidas, inventario siempre al día.',
    alt: 'Comerciante de minimarket escaneando productos con SevenPOS',
    composite: true,
  },
  {
    id: 'restaurantes',
    label: 'Restaurantes',
    // TODO(asset): Swap registry image when an approved restaurant asset is available.
    image: marketingAssets.businesses.restaurants,
    title: 'Restaurante',
    description: 'Cada venta y cada cierre, en orden.',
    alt: 'Terminal SevenPOS en un comercio de alimentos',
    composite: false,
  },
  {
    id: 'cafeterias',
    label: 'Cafeterías',
    image: marketingAssets.businesses.cafes,
    title: 'Cafetería',
    description: 'Atiende rápido incluso en hora punta.',
    alt: 'Terminal SevenPOS operando en una cafetería',
    composite: false,
  },
  {
    id: 'retail',
    label: 'Retail',
    image: marketingAssets.businesses.retail,
    title: 'Retail',
    description: 'Productos y existencias siempre visibles.',
    alt: 'Inventario de productos gestionado con SevenPOS',
    composite: false,
  },
  {
    id: 'servicios',
    label: 'Servicios',
    // TODO(asset): Swap registry image when an approved services asset is available.
    image: marketingAssets.businesses.services,
    title: 'Servicios',
    description: 'Tu operación, donde la necesites.',
    alt: 'SevenPOS disponible en computador y teléfono',
    composite: false,
  },
];
