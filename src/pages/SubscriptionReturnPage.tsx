import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/shell/PageContainer';
import { Button } from '../components/ui/Button';
import { billingApiClient } from '../infrastructure/billing/BillingApiClient';
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

/**
 * SubscriptionReturnPage — landing page after Mercado Pago checkout redirect.
 *
 * SECURITY INVARIANT:
 * This page NEVER reads query params to determine subscription status.
 * It always re-queries the backend (/billing-subscription-status) to get
 * the authoritative cloud state. Query params (status=approved, etc.) are
 * ignored entirely for entitlement decisions.
 */

type PageState = 'loading' | 'active' | 'pending' | 'failed';

interface SubscriptionReturnPageProps {
  onNavigateToSubscription?: () => void;
  onNavigateToDashboard?: () => void;
}

export const SubscriptionReturnPage: React.FC<SubscriptionReturnPageProps> = ({
  onNavigateToSubscription,
  onNavigateToDashboard,
}) => {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [pollCount, setPollCount] = useState(0);
  const MAX_POLLS = 6;
  const POLL_INTERVAL_MS = 3000;

  useEffect(() => {
    // Intentionally do NOT read window.location.search for status
    let cancelled = false;

    async function checkCloudState(attempt: number) {
      try {
        if (attempt === 0) {
          // Trigger immediate server-side reconciliation in case webhook is pending
          await billingApiClient.reconcileSubscription().catch(() => {});
        }

        const status = await billingApiClient.getSubscriptionStatus();
        if (cancelled) return;

        if (status.planCode === 'PRO' && (status.status === 'ACTIVE' || status.status === 'PAST_DUE')) {
          setPageState('active');
          return;
        }

        if (status.status === 'EXPIRED') {
          setPageState('failed');
          return;
        }

        // PENDING or still FREE — webhook hasn't arrived yet
        if (attempt < MAX_POLLS) {
          setPollCount(attempt + 1);
          setTimeout(() => {
            if (!cancelled) checkCloudState(attempt + 1);
          }, POLL_INTERVAL_MS);
        } else {
          // After max polls, show pending state
          setPageState('pending');
        }
      } catch {
        if (!cancelled) setPageState('failed');
      }
    }

    checkCloudState(0);
    return () => { cancelled = true; };
  }, []);

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto text-center space-y-6 px-4">
        {pageState === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center">
              <Loader2 size={30} className="text-brand-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">Verificando tu suscripción…</h2>
              <p className="text-xs text-text-secondary">
                Estamos confirmando el pago con nuestros servidores.
                {pollCount > 0 && ` (${pollCount}/${MAX_POLLS})`}
              </p>
            </div>
          </>
        )}

        {pageState === 'active' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={30} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-text-primary">¡Ya eres Pro!</h2>
              <p className="text-sm text-text-secondary">
                Tu suscripción SevenPOS Pro está activa. Todas las funciones avanzadas están desbloqueadas.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {onNavigateToDashboard && (
                <Button variant="primary" size="md" className="w-full" onClick={onNavigateToDashboard}>
                  Ir al Panel Principal
                </Button>
              )}
              {onNavigateToSubscription && (
                <Button variant="secondary" size="sm" className="w-full" onClick={onNavigateToSubscription}
                  leftIcon={<ArrowLeft size={14} />}>
                  Ver mi suscripción
                </Button>
              )}
            </div>
          </>
        )}

        {pageState === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-surface-secondary border border-border-default flex items-center justify-center">
              <AlertCircle size={30} className="text-text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">Pago en proceso</h2>
              <p className="text-xs text-text-secondary">
                Tu pago está siendo procesado. La activación puede tardar unos minutos.
                Regresa a tu suscripción para ver el estado actualizado.
              </p>
            </div>
            {onNavigateToSubscription && (
              <Button variant="secondary" size="sm" className="w-full" onClick={onNavigateToSubscription}
                leftIcon={<ArrowLeft size={14} />}>
                Volver a Suscripción
              </Button>
            )}
          </>
        )}

        {pageState === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={30} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">No pudimos confirmar el pago</h2>
              <p className="text-xs text-text-secondary">
                El pago no pudo confirmarse. Si realizaste el pago, puede tomar unos minutos en reflejarse.
                Consulta tu suscripción o contáctanos si el problema persiste.
              </p>
            </div>
            {onNavigateToSubscription && (
              <Button variant="secondary" size="sm" className="w-full" onClick={onNavigateToSubscription}
                leftIcon={<ArrowLeft size={14} />}>
                Volver a Suscripción
              </Button>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};
