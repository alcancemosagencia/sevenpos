import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { UsageOverview } from '../domain/subscription/Entitlement';
import { PLAN_DEFINITIONS, PlanCode } from '../domain/subscription/Plan';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { useAuth } from '../context/AuthContext';
import { UsageMeterCard } from '../components/subscription/UsageMeterCard';
import { PlanComparisonTable } from '../components/subscription/PlanComparisonTable';
import { ComingSoonRoadmap } from '../components/subscription/ComingSoonRoadmap';
import { UpgradePromptModal } from '../components/subscription/UpgradePromptModal';
import {
  Sparkles,
  Check,
  ArrowRight,
  RefreshCw,
  Clock,
  HeartHandshake,
} from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const { businessId } = useAuth();
  const currentBusinessId = businessId || 'primary-business';

  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const usageService = repositoryFactory.getUsageService();

  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await usageService.getUsageOverview(currentBusinessId);
      setOverview(data);
    } catch (err) {
      console.error('Failed to load subscription overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusinessId, usageService]);

  useEffect(() => {
    let isMounted = true;
    usageService
      .getUsageOverview(currentBusinessId)
      .then((data) => {
        if (isMounted) {
          setOverview(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load subscription overview:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [currentBusinessId, usageService]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleInterestSubmit = () => {
    setIsInterestModalOpen(false);
    showToast('¡Gracias por tu interés! Te avisaremos en cuanto SevenPOS Pro esté disponible.');
  };

  const currentPlanCode: PlanCode = overview?.plan || 'FREE';
  const freePlanDef = PLAN_DEFINITIONS.FREE;
  const proPlanDef = PLAN_DEFINITIONS.PRO;

  return (
    <PageContainer>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <PageHeader
          title="Suscripción"
          subtitle="Consulta tu plan, uso y funciones disponibles."
          actions={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Actualizar
            </Button>
          }
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-xs font-bold text-brand-primary animate-in fade-in duration-150 flex items-center gap-2">
            <HeartHandshake size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. CURRENT PLAN ACTIVE BANNER */}
        <Card className="p-5 sm:p-6 relative overflow-hidden bg-linear-to-r from-surface to-surface-secondary border-border-default">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                  Plan actual
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Activo
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                {currentPlanCode === 'FREE' ? freePlanDef.name : proPlanDef.name}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-xl">
                {currentPlanCode === 'FREE' ? freePlanDef.description : proPlanDef.description}
              </p>
            </div>

            {currentPlanCode === 'FREE' && (
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={15} />}
                onClick={() => setIsUpgradeModalOpen(true)}
                className="self-start sm:self-auto shrink-0 shadow-md"
              >
                Conocer Plan Pro
              </Button>
            )}
          </div>
        </Card>

        {/* 2. USAGE METERS SECTION */}
        {overview && (
          <UsageMeterCard
            overview={overview}
            onUpgradeClick={() => setIsUpgradeModalOpen(true)}
          />
        )}

        {/* 3. VALUE PROPOSITION HEADLINE */}
        <div className="text-center pt-4 pb-2 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold border border-brand-primary/20">
            <Sparkles size={14} />
            <span>SevenPOS Pro</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            SevenPOS empieza a trabajar por ti
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto">
            Automatiza procesos, delega en tu equipo y obtén control analítico total de tu negocio.
          </p>
        </div>

        {/* 4. TWO PLAN CARDS (FREE VS PRO) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FREE CARD */}
          <Card className="p-6 sm:p-7 space-y-6 border-border-default flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{freePlanDef.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{freePlanDef.tagline}</p>
                </div>
                {currentPlanCode === 'FREE' && (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-surface-secondary text-text-tertiary border border-border-subtle">
                    Plan actual
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5 pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-text-primary">
                  {freePlanDef.priceFormatted}
                </span>
                <span className="text-xs text-text-tertiary">/ {freePlanDef.billingInterval}</span>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Incluye:
                </p>
                <div className="space-y-2.5">
                  {[
                    'Ventas y tickets ilimitados en mostrador',
                    'Hasta 100 productos activos en catálogo',
                    'Hasta 50 clientes registrados',
                    '1 usuario operador (cuenta titular)',
                    'Últimos 7 días de historial en reportes',
                    'Últimos 3 días de historial en auditoría',
                    'Exportaciones a Excel (XLSX) y CSV',
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-text-secondary">
                      <div className="w-4 h-4 rounded-full bg-text-tertiary/15 text-text-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <Button variant="secondary" size="md" className="w-full" disabled>
                {currentPlanCode === 'FREE' ? 'Plan actualmente activo' : 'Plan Base'}
              </Button>
            </div>
          </Card>

          {/* PRO CARD */}
          <Card className="p-6 sm:p-7 space-y-6 border-2 border-brand-primary/40 relative flex flex-col justify-between shadow-xl bg-linear-to-b from-surface to-brand-primary/[0.03]">
            {/* Top Popular Badge */}
            <div className="absolute -top-3 right-6">
              <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-brand-primary text-white shadow-md uppercase tracking-wider">
                Recomendado
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    {proPlanDef.name}
                    <Sparkles size={16} className="text-brand-primary" />
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">{proPlanDef.tagline}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 pt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-brand-primary">
                  {proPlanDef.priceFormatted}
                </span>
                <span className="text-xs text-text-tertiary">({proPlanDef.billingInterval})</span>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Todo lo de Free, más:
                </p>
                <div className="space-y-2.5">
                  {[
                    'Productos y clientes ilimitados',
                    'Hasta 5 usuarios operadores con PIN y roles (Admin, Cajero)',
                    'Fast User Switch en el Punto de Venta',
                    'Histórico completo en reportes y auditoría',
                    'Analítica de márgenes brutos, utilidades y comparativas',
                    'Exportaciones XLSX y CSV de histórico completo',
                    'Acceso prioritario a próximas funciones',
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-text-primary font-medium">
                      <div className="w-4 h-4 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={15} />}
                className="w-full shadow-lg"
                onClick={() => setIsInterestModalOpen(true)}
              >
                {proPlanDef.ctaLabel}
              </Button>
            </div>
          </Card>
        </div>

        {/* 5. PLAN COMPARISON TABLE */}
        <PlanComparisonTable />

        {/* 6. COMING SOON ROADMAP */}
        <ComingSoonRoadmap />
      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onNavigateToSubscription={() => {
          setIsUpgradeModalOpen(false);
          setIsInterestModalOpen(true);
        }}
      />

      {/* Interest Modal (Truthful UX - No fake checkout) */}
      {isInterestModalOpen && (
        <div
          data-testid="interest-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
          onClick={() => setIsInterestModalOpen(false)}
        >
          <div
            data-testid="interest-modal"
            className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Descubre SevenPOS Pro</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Estamos afinando los últimos detalles para el lanzamiento de los planes Pro.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-border-subtle text-xs text-text-secondary space-y-2">
              <p>
                Al registrar tu interés, serás de los primeros en acceder a las capacidades avanzadas de equipo, analítica y catálogo ilimitado.
              </p>
              <div className="flex items-center gap-1.5 text-brand-primary font-bold">
                <Clock size={14} />
                <span>Disponible muy pronto</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsInterestModalOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleInterestSubmit}
              >
                Avísame cuando esté disponible
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
