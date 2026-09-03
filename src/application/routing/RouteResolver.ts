export type AppRoute =
  | 'loading'
  | '/register'
  | '/login'
  | '/verify-email'
  | '/setup-business'
  | '/enroll-device'
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
  authMachineState?: string;
  onboardingStatus?: 'incomplete' | 'completed';
  sessionStatus?: 'locked' | 'unlocked';
  isCompletionCelebrationActive?: boolean;
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
 * Single source of truth for resolving entry routes based on authentication & machine state.
 *
 * Invariants:
 * 1. !isHydrated -> 'loading'
 * 2. Explicit authMachineState takes priority when provided (Cloud Identity).
 * 3. isCompletionCelebrationActive === true -> '/register'
 * 4. onboardingStatus === 'incomplete' -> '/register' (legacy local test harness)
 * 5. sessionStatus === 'locked' -> '/login'
 * 6. sessionStatus === 'unlocked' -> requested protected route or '/dashboard'
 */
export function resolveEntryRoute(state: RouteResolutionState): AppRoute {
  if (!state.isHydrated) {
    return 'loading';
  }

  // 1. Explicit Auth Machine State (Cloud Identity) takes priority if provided
  if (state.authMachineState) {
    switch (state.authMachineState) {
      case 'REGISTER_REQUIRED':
        return '/register';
      case 'EMAIL_VERIFICATION_REQUIRED':
        return '/verify-email';
      case 'BUSINESS_SETUP_REQUIRED':
      case 'EXISTING_LOCAL_BUSINESS_LINK_REQUIRED':
        return '/setup-business';
      case 'DEVICE_ENROLLMENT_REQUIRED':
        return '/enroll-device';
      case 'DEVICE_UNLOCKED': {
        const preservedRoute = normalizeProtectedPath(state.requestedPath);
        return preservedRoute || '/dashboard';
      }
      case 'ACCOUNT_REQUIRED':
      case 'DEVICE_LOCKED':
      case 'PIN_SETUP_REQUIRED':
      default:
        return '/login';
    }
  }

  // 2. Active runtime-only Step 6 celebration in the current session
  if (state.isCompletionCelebrationActive === true) {
    return '/register';
  }

  // 3. Local onboarding status if incomplete (Local-first test harness)
  if (state.onboardingStatus === 'incomplete') {
    return '/register';
  }

  // 4. Configured installation: if locked, strictly /login
  if (state.sessionStatus === 'locked') {
    return '/login';
  }

  // 5. Configured installation: if unlocked, preserve valid protected deep-link / reload route
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
