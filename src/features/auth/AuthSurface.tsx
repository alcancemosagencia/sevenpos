import type { ReactNode } from 'react';

/** Local color scope: never changes the operational theme or its stored preference. */
export function AuthSurface({ children }: { children: ReactNode }) {
  return <div className="auth-surface light" data-testid="auth-light-surface">{children}</div>;
}
