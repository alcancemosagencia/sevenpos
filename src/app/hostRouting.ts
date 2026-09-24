export type AppHost = 'platform' | 'marketing' | 'customer';

const publicMarketingPaths = new Set([
  '/', '/funciones', '/planes', '/negocios', '/descargar', '/contacto',
  '/soporte', '/privacidad', '/terminos',
]);

export function isPublicMarketingPath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/$/, '') || '/';
  return publicMarketingPaths.has(path) || path.startsWith('/negocios/') || path.startsWith('/legal/');
}

const legacyCustomerPaths = new Set([
  '/login', '/register', '/dashboard', '/pos', '/sales', '/cash', '/cash-register',
  '/products', '/catalog/products', '/categories', '/catalog/categories',
  '/inventory', '/inventory/movements', '/stock', '/stock-adjustments',
  '/purchases/orders', '/purchases/purchase-orders', '/purchase-orders',
  '/purchases/suppliers', '/suppliers', '/customers', '/expenses',
  '/finances/expenses', '/reports', '/audit', '/settings', '/help',
  '/subscription', '/recharges', '/verify-email', '/setup-business', '/enroll-device',
]);

const legacyCustomerPrefixes = ['/customers/', '/products/', '/catalog/products/', '/purchase-orders/'];
const legacyAuthPaths = new Set(['/auth/callback', '/auth/reset-password', '/subscription/return']);
const safeQueryKeys = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);

export type HostEntry = 'platform' | 'customer' | 'marketing' | 'redirect' | 'legacy-billing-return' | 'legacy-auth-callback' | 'legacy-password-reset';

/** Above-the-SPA decision. A cutover root never selects CustomerApp. */
export function resolveHostEntry(hostname: string, pathname: string, search: string, marketingRootEnabled: boolean): { entry: HostEntry; destination?: string } {
  const host = hostname.toLowerCase();
  const path = normalizedPath(pathname);
  if (host === 'platform.sevenpos.pro' || host === 'platform.localhost') return { entry: 'platform' };
  if (host === 'app.sevenpos.pro' || host === 'app.localhost') {
    return { entry: path === '/subscription/return' ? 'legacy-billing-return' : 'customer' };
  }
  if ((host === 'sevenpos.pro' || host === 'www.sevenpos.pro') && marketingRootEnabled) {
    if (path === '/subscription/return') return { entry: 'legacy-billing-return' };
    if (path === '/auth/callback') return { entry: 'legacy-auth-callback' };
    if (path === '/auth/reset-password') return { entry: 'legacy-password-reset' };
    const destination = legacyCustomerRedirect(host, pathname, search) ?? canonicalWwwRedirect(host, pathname, search);
    return destination ? { entry: 'redirect', destination } : { entry: 'marketing' };
  }
  return { entry: resolveAppHost(host, pathname, search, marketingRootEnabled) };
}

function normalizedPath(pathname: string): string {
  return pathname.toLowerCase().replace(/\/+$/, '') || '/';
}

function safePathname(pathname: string): boolean {
  return pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('\\');
}

/** Only the explicit Platform hostname may boot Platform in production. */
export function resolveAppHost(hostname: string, pathname: string, search: string, marketingRootEnabled = false): AppHost {
  const host = hostname.toLowerCase();
  const path = normalizedPath(pathname);
  if (host === 'platform.sevenpos.pro' || host === 'platform.localhost') return 'platform';
  if (host === 'app.sevenpos.pro' || host === 'app.localhost') return 'customer';
  if (host === 'marketing.localhost') return 'marketing';
  if (host === 'sevenpos.pro' || host === 'www.sevenpos.pro') {
    if (!marketingRootEnabled) {
      return search.includes('__marketing=1') || path === '/landing' || path === '/marketing' ? 'marketing' : 'customer';
    }
    // Old emailed auth links and payment returns stay on their original origin.
    // Moving one-time credentials across origins would break PKCE or leak tokens.
    return legacyAuthPaths.has(path) ? 'customer' : 'marketing';
  }
  // Local preview only; never use pathname/query to select Platform.
  if (search.includes('__marketing=1') || path === '/landing' || path === '/marketing') return 'marketing';
  return 'customer';
}

/** A fixed destination host and an allowlist of non-sensitive campaign parameters. */
export function legacyCustomerRedirect(hostname: string, pathname: string, search: string): string | null {
  const host = hostname.toLowerCase();
  if (host !== 'sevenpos.pro' && host !== 'www.sevenpos.pro') return null;
  if (!safePathname(pathname)) return null;
  const path = normalizedPath(pathname);
  if (legacyAuthPaths.has(path)) return null;
  if (!legacyCustomerPaths.has(path) && !legacyCustomerPrefixes.some((prefix) => path.startsWith(prefix))) return null;

  const destination = new URL(customerAppOrigin);
  destination.pathname = pathname;
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    if (safeQueryKeys.has(key) && value.length <= 200) destination.searchParams.append(key, value);
    if (path === '/reports' && key === 'tab' && ['sales', 'inventory', 'finance', 'summary'].includes(value)) destination.searchParams.set('tab', value);
  }
  return destination.toString();
}

export function canonicalWwwRedirect(hostname: string, pathname: string, search: string): string | null {
  if (hostname.toLowerCase() !== 'www.sevenpos.pro') return null;
  if (!safePathname(pathname)) return null;
  if (legacyCustomerRedirect(hostname, pathname, search)) return null;
  if (legacyAuthPaths.has(normalizedPath(pathname))) return null;
  const destination = new URL(marketingOrigin);
  destination.pathname = pathname;
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    if (safeQueryKeys.has(key) && value.length <= 200) destination.searchParams.append(key, value);
  }
  return destination.toString();
}
import { customerAppOrigin, marketingOrigin } from './customerAppUrls';
