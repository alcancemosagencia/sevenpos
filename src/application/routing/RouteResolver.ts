export type AppRoute =
  | 'loading'
  | '/register'
  | '/login'
  | '/dashboard'
  | '/pos'
  | '/sales'
  | '/catalog/products'
  | '/catalog/categories'
  | '/inventory'
  | '/inventory/movements'
  | '/purchases/orders'
  | '/purchases/suppliers'
  | '/finances/cash'
  | '/finances/expenses'
  | '/customers'
  | '/recharges'
  | '/reports'
  | '/audit'
  | '/settings'
  | '/help'
  | '/subscription';

export interface RouteResolutionState {
  isHydrated: boolean;
  onboardingStatus: 'incomplete' | 'completed';
  sessionStatus: 'locked' | 'unlocked';
  /**
   * Runtime-only UI state for the first-run celebration (Step 6).
   * MUST ALWAYS be false on fresh boot and MUST NEVER be persisted or hydrated.
   */
  isCompletionCelebrationActive?: boolean;
  /**
   * The requested URL pathname (e.g., from deep link or browser reload).
   */
  requestedPath?: string;
}

/**
 * Normalizes any legacy or alias protected pathname into its canonical AppRoute.
 */
export function normalizeProtectedPath(rawPath?: string | null): AppRoute | null {
  if (!rawPath) return null;
  const clean = rawPath.split('?')[0].replace(/\/+$/, '') || '/';

  switch (clean) {
    case '/dashboard':
      return '/dashboard';
    case '/pos':
      return '/pos';
    case '/sales':
      return '/sales';
    case '/catalog/products':
    case '/products':
      return '/catalog/products';
    case '/catalog/categories':
    case '/categories':
      return '/catalog/categories';
    case '/inventory':
    case '/stock':
      return '/inventory';
    case '/inventory/movements':
    case '/stock-adjustments':
      return '/inventory/movements';
    case '/purchases/orders':
    case '/purchases/purchase-orders':
    case '/purchase-orders':
      return '/purchases/orders';
    case '/purchases/suppliers':
    case '/suppliers':
      return '/purchases/suppliers';
    case '/cash':
    case '/finances/cash':
    case '/finances/cash-register':
    case '/cash-register':
      return '/finances/cash';
    case '/finances/expenses':
    case '/expenses':
      return '/finances/expenses';
    case '/customers':
      return '/customers';
    case '/recharges':
      return '/recharges';
    case '/reports':
      return '/reports';
    case '/audit':
      return '/audit';
    case '/settings':
      return '/settings';
    case '/help':
      return '/help';
    case '/subscription':
      return '/subscription';
    default:
      if (clean.startsWith('/customers/')) {
        return '/customers';
      }
      return null;
  }
}

/**
 * Single source of truth for resolving entry routes based on authentication & onboarding state.
 *
 * Invariants:
 * 1. !isHydrated -> 'loading'
 * 2. isCompletionCelebrationActive === true -> '/register' (ephemeral celebration only during current active session)
 * 3. onboardingStatus === 'incomplete' -> '/register'
 * 4. onboardingStatus === 'completed' && sessionStatus === 'locked' -> '/login' (NEVER /register or Step 6 on fresh boot)
 * 5. onboardingStatus === 'completed' && sessionStatus === 'unlocked' -> requested protected route or '/dashboard'
 */
export function resolveEntryRoute(state: RouteResolutionState): AppRoute {
  if (!state.isHydrated) {
    return 'loading';
  }

  // Active runtime-only Step 6 celebration in the current session
  if (state.isCompletionCelebrationActive === true) {
    return '/register';
  }

  // If onboarding has never been completed
  if (state.onboardingStatus === 'incomplete') {
    return '/register';
  }

  // Configured installation: if locked, strictly /login
  if (state.sessionStatus === 'locked') {
    return '/login';
  }

  // Configured installation: if unlocked, preserve valid protected deep-link / reload route
  const preservedRoute = normalizeProtectedPath(state.requestedPath);
  if (preservedRoute) {
    return preservedRoute;
  }

  return '/dashboard';
}

/**
 * Synchronizes the browser window URL with the canonical app route using History API.
 */
export function syncBrowserUrl(targetRoute: AppRoute): void {
  if (typeof window === 'undefined' || !window.history || targetRoute === 'loading') {
    return;
  }

  if (window.location.pathname !== targetRoute) {
    window.history.replaceState(null, '', targetRoute);
  }
}
