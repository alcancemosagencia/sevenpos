/** Newly generated web auth links always return to the canonical customer app. */
export function authRedirectOrigin(hostname: string, origin: string): string {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.localhost') return origin;
  return 'https://app.sevenpos.pro';
}
