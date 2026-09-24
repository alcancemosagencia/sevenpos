import { getCustomerAppOrigin } from '../../app/customerAppUrls';

/** Newly generated web auth links always return to the canonical customer app. */
export function authRedirectOrigin(hostname: string, origin: string): string {
  return getCustomerAppOrigin(hostname, origin);
}
