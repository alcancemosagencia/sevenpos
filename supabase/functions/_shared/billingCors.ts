/** Browser origins needed during the root-to-app transition. No wildcard/reflection. */
export const allowedBillingOrigins = [
  'https://app.sevenpos.pro',
  'https://sevenpos.pro',
  'https://www.sevenpos.pro',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const;

export function isAllowedBillingOrigin(origin: string | null): boolean {
  return origin === null || allowedBillingOrigins.some((allowed) => allowed === origin);
}

const sdkRequestHeaders = 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage';

export function billingCorsHeaders(origin: string | null, allowedHeaders = sdkRequestHeaders): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
  if (origin !== null && isAllowedBillingOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function billingPreflightResponse(origin: string | null, headers: Record<string, string>): Response {
  return isAllowedBillingOrigin(origin)
    ? new Response(null, { status: 204, headers })
    : new Response(null, { status: 403, headers: { Vary: 'Origin' } });
}
