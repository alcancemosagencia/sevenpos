export const customerAppOrigin = 'https://app.sevenpos.pro';
export const marketingOrigin = 'https://sevenpos.pro';
export const platformOrigin = 'https://platform.sevenpos.pro';

const localHosts = new Set(['localhost', '127.0.0.1', 'app.localhost']);

export function getCustomerAppOrigin(hostname = typeof window === 'undefined' ? '' : window.location.hostname, origin = typeof window === 'undefined' ? '' : window.location.origin): string {
  return localHosts.has(hostname.toLowerCase()) ? origin : customerAppOrigin;
}

/** Use only fixed app routes; callers never pass secrets or untrusted full URLs. */
export function getCustomerAppUrl(pathname: string, hostname?: string, origin?: string): string {
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\') || pathname.includes('?') || pathname.includes('#')) {
    throw new Error('UNSAFE_CUSTOMER_APP_PATH');
  }
  return `${getCustomerAppOrigin(hostname, origin)}${pathname}`;
}
