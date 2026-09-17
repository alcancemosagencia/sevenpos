import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { UsageOverview } from '../domain/subscription/Entitlement';
import { PlanCode } from '../domain/subscription/Plan';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { getSupabaseClient } from '../infrastructure/cloud/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UsageMeterCard } from '../components/subscription/UsageMeterCard';
import { PlanComparisonTable } from '../components/subscription/PlanComparisonTable';
import { ComingSoonRoadmap } from '../components/subscription/ComingSoonRoadmap';
import { UpgradePromptModal } from '../components/subscription/UpgradePromptModal';
import {
  billingApiClient,
  BillingInterval,
  PricePreviewResponse,
  CouponStatus,
  SubscriptionStatusResponse,
} from '../infrastructure/billing/BillingApiClient';
import {
  getBillingCapability,
  buildSalesWhatsAppUrl,
} from '../domain/billing/CountryBillingConfig';
import { useCountry } from '../context/CountryContext';
import {
  Sparkles,
  Check,
  ArrowRight,
  RefreshCw,
  Calendar,
  Tag,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  MessageCircle,
} from 'lucide-react';

/** Format CLP integer as $XX.XXX */
function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

export const SubscriptionPage: React.FC = () => {
  const { businessId, activeBusinessName, reauthenticateOwnerForBilling } = useAuth();
  const currentBusinessId = businessId || 'primary-business';
  const { country } = useCountry();
  const billingCapability = getBillingCapability(country?.countryCode);

  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Pricing UI state
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('MONTHLY');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<CouponStatus | null>(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  // Canonical Price Preview from Server
  const [pricePreview, setPricePreview] = useState<PricePreviewResponse | null>(null);
  const [pricePreviewError, setPricePreviewError] = useState<string | null>(null);
  const [isPricePreviewLoading, setIsPricePreviewLoading] = useState(true);

  // Checkout modal state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutModalError, setCheckoutModalError] = useState<string | null>(null);

  // Cancel state
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [cancelScheduled, setCancelScheduled] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const usageService = repositoryFactory.getUsageService();

  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const [overviewData, statusData] = await Promise.all([
        usageService.getUsageOverview(currentBusinessId),
        billingApiClient.getSubscriptionStatus().catch(() => null),
      ]);
      setOverview(overviewData);
      if (statusData) setSubStatus(statusData);
    } catch (err) {
      console.error('Failed to load subscription overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusinessId, usageService]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      usageService.getUsageOverview(currentBusinessId),
      billingApiClient.getSubscriptionStatus().catch(() => null),
    ])
      .then(([overviewData, statusData]) => {
        if (isMounted) {
          setOverview(overviewData);
          if (statusData) setSubStatus(statusData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load subscription overview:', err);
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [currentBusinessId, usageService]);

  // Fetch canonical server price preview whenever interval or applied coupon changes
  const fetchPricePreview = useCallback(async () => {
    setIsPricePreviewLoading(true);
    setPricePreviewError(null);
    try {
      const preview = await billingApiClient.getPricePreview({
        billingInterval: selectedInterval,
        couponCode: appliedCouponCode || undefined,
      });
      setPricePreview(preview);
      setPricePreviewError(null);
    } catch (err) {
      console.error('Failed to fetch price preview:', err);
      // NEVER silently fall back to standard pricing.
      // Truthful error state disables checkout until server price is available.
      setPricePreview(null);
      setPricePreviewError('No pudimos cargar el precio en este momento.');
    } finally {
      setIsPricePreviewLoading(false);
    }
  }, [selectedInterval, appliedCouponCode]);

  useEffect(() => {
    let isMounted = true;
    billingApiClient
      .getPricePreview({
        billingInterval: selectedInterval,
        couponCode: appliedCouponCode || undefined,
      })
      .then((preview) => {
        if (isMounted) {
          setPricePreview(preview);
          setPricePreviewError(null);
          setIsPricePreviewLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch price preview:', err);
        if (isMounted) {
          setPricePreview(null);
          setPricePreviewError('No pudimos cargar el precio en este momento.');
          setIsPricePreviewLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [selectedInterval, appliedCouponCode]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Owner Cloud Re-Auth modal state
  const [isReAuthModalOpen, setIsReAuthModalOpen] = useState(false);
  const [reAuthEmail, setReAuthEmail] = useState('');
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [reAuthError, setReAuthError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    const rawCode = couponInput.trim().toUpperCase();
    if (!rawCode) return;
    setIsCouponLoading(true);
    try {
      const result = await billingApiClient.getPricePreview({
        billingInterval: selectedInterval,
        couponCode: rawCode,
      });

      if (result.couponStatus?.reason === 'PUBLIC_PROMOTION_ALREADY_APPLIED') {
        // User typed FOUNDERS_50 or current public promotion
        setCouponFeedback(result.couponStatus);
        setAppliedCouponCode(null);
        setPricePreview(result);
      } else if (result.couponStatus?.valid) {
        // Explicit private coupon applied
        setCouponFeedback(result.couponStatus);
        setAppliedCouponCode(rawCode);
        setPricePreview(result);
      } else if (result.couponStatus?.reason === 'AUTH_REQUIRED') {
        setCouponFeedback(result.couponStatus);
      } else {
        // Invalid, expired, inferior, etc.
        setCouponFeedback(result.couponStatus || {
          code: rawCode,
          valid: false,
          reason: 'INVALID',
          message: 'Código no válido.',
        });
        setPricePreview(result);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('AUTH_REQUIRED') || errMsg.includes('401')) {
        setCouponFeedback({
          code: rawCode,
          valid: false,
          reason: 'AUTH_REQUIRED',
          message: 'Para aplicar cupones privados debes iniciar sesión con tu cuenta de propietario.',
        });
      } else {
        setCouponFeedback({
          code: rawCode,
          valid: false,
          reason: 'ERROR',
          message: 'No pudimos verificar el código en este momento.',
        });
      }
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleShowCheckout = async () => {
    if (!pricePreview) return;
    setCheckoutModalError(null);
    // Check if cloud session exists before opening checkout
    const { data: sessionData } = await getSupabaseClient().auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user) {
      setIsReAuthModalOpen(true);
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (isCheckoutLoading || !pricePreview) return;
    setCheckoutModalError(null);

    // Verify Cloud Auth session before checkout
    const { data: sessionData } = await getSupabaseClient().auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user) {
      setIsCheckoutModalOpen(false);
      setIsReAuthModalOpen(true);
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const planId = pricePreview.planId || (selectedInterval === 'ANNUAL' ? 'pro_annual' : 'pro_monthly');
      const result = await billingApiClient.createBillingIntent({
        planId,
        billingInterval: selectedInterval,
        couponCode: pricePreview.appliedPromotionCode || undefined,
      });

      // CHECKOUT CONSISTENCY INVARIANT:
      // UI preview gross MUST match billing-create-intent finalGrossAmount exactly.
      if (result.finalGrossAmount !== pricePreview.finalGrossAmount) {
        console.error('Checkout consistency mismatch:', {
          uiPreviewGross: pricePreview.finalGrossAmount,
          createIntentGross: result.finalGrossAmount,
        });
        const msg = 'Error de consistencia de precio: el total del servidor no coincide. Intenta nuevamente.';
        setCheckoutModalError(msg);
        showToast(msg, 'error');
        setIsCheckoutLoading(false);
        return;
      }

      if (!result.initPoint) {
        const msg = 'No pudimos obtener el enlace de pago de Mercado Pago.';
        setCheckoutModalError(msg);
        showToast(msg, 'error');
        setIsCheckoutLoading(false);
        return;
      }

      // Redirect to MP checkout — server verified, not query-param activated
      window.location.href = result.initPoint;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('ALREADY_PRO') || errMsg.includes('409')) {
        setIsCheckoutModalOpen(false);
        showToast('Tu negocio ya tiene SevenPOS Pro activo.', 'success');
        await handleRefresh();
      } else if (errMsg.includes('UNAUTHORIZED') || errMsg.includes('AUTH_REQUIRED') || errMsg.includes('401')) {
        setIsCheckoutModalOpen(false);
        setIsReAuthModalOpen(true);
      } else {
        let msg = 'No pudimos conectar con el servicio de suscripciones.';
        if (errMsg.includes('NOT_OWNER') || errMsg.includes('403')) {
          msg = 'Esta acción solo puede realizarla el propietario del negocio.';
        } else if (errMsg.includes('PROVIDER_TIMEOUT') || errMsg.includes('504') || errMsg.includes('timed out')) {
          msg = 'Mercado Pago está tardando más de lo esperado. Inténtalo nuevamente.';
        } else if (errMsg.includes('PROVIDER_ERROR') || errMsg.includes('502')) {
          msg = 'No pudimos conectar con Mercado Pago. Inténtalo nuevamente.';
        } else if (errMsg.includes('INTENT_CREATE_FAILED') || errMsg.includes('500')) {
          msg = 'No pudimos iniciar el proceso de suscripción.';
        }
        setCheckoutModalError(msg);
        showToast(msg, 'error');
      }
      setIsCheckoutLoading(false);
    }
  };

  const handleReAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reAuthLoading || !reAuthEmail.trim() || !reAuthPassword) return;
    setReAuthLoading(true);
    setReAuthError(null);
    try {
      const res = await reauthenticateOwnerForBilling(reAuthEmail.trim(), reAuthPassword);
      if (!res.success) {
        setReAuthError(res.error || 'No pudimos verificar la cuenta del propietario.');
        setReAuthLoading(false);
        return;
      }
      setIsReAuthModalOpen(false);
      setReAuthPassword('');
      setReAuthError(null);
      // Reopen checkout modal for explicit user confirmation
      setIsCheckoutModalOpen(true);
    } catch (err: unknown) {
      setReAuthError(err instanceof Error ? err.message : 'No pudimos verificar la cuenta del propietario.');
    } finally {
      setReAuthLoading(false);
    }
  };

  const handleCancelRenewal = async () => {
    setIsCancelConfirmOpen(true);
  };

  const handleCancelConfirmed = async () => {
    setIsCancelConfirmOpen(false);
    setIsCancelLoading(true);
    try {
      const result = await billingApiClient.cancelSubscription();
      if (result.success) {
        setCancelScheduled(true);
        showToast('Renovación cancelada. Tu acceso Pro se mantiene hasta el vencimiento del período.', 'success');
        await handleRefresh();
      }
    } catch {
      showToast('No pudimos procesar la cancelación. Intenta nuevamente.', 'error');
    } finally {
      setIsCancelLoading(false);
    }
  };

  const currentPlanCode: PlanCode = overview?.plan || 'FREE';
  const isPro = currentPlanCode === 'PRO';

  return (
    <PageContainer>
      <div className="space-y-6 max-w-4xl mx-auto pb-28 sm:pb-12 w-full min-w-0 overflow-hidden">
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

        {/* Toast */}
        {toastMessage && (
          <div className={`p-4 rounded-2xl border text-xs font-bold animate-in fade-in duration-150 flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* 1. PRO SUBSCRIBER BANNER (When user already has PRO) */}
        {isPro && (
          <Card className="p-5 sm:p-7 bg-surface border border-border-default rounded-3xl relative overflow-hidden w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Plan actual</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Activo
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                  SevenPOS Pro
                  <Sparkles size={20} className="text-brand-primary" />
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary max-w-xl">
                  Tu suscripción está activa y todas las funciones avanzadas para tu negocio están desbloqueadas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!cancelScheduled && !subStatus?.cancelAtPeriodEnd ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelRenewal}
                    disabled={isCancelLoading}
                    className="text-text-tertiary hover:text-red-600 dark:hover:text-red-400 text-xs"
                  >
                    {isCancelLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                    Cancelar renovación
                  </Button>
                ) : (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-surface-secondary text-text-secondary border border-border-default">
                    Renovación cancelada
                  </span>
                )}
              </div>
            </div>

            {/* Commercial subscription details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-border-subtle">
              <div className="p-3.5 rounded-2xl bg-surface-secondary border border-border-subtle">
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Período de cobro</p>
                <p className="text-sm font-bold text-text-primary">
                  {subStatus?.billingInterval === 'ANNUAL' ? 'Anual' : 'Mensual'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-secondary border border-border-subtle">
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                  {cancelScheduled || subStatus?.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima renovación'}
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {subStatus?.currentPeriodEnd
                    ? new Date(subStatus.currentPeriodEnd).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Renovación automática'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-secondary border border-border-subtle">
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Promoción aplicada</p>
                <p className="text-sm font-bold text-brand-primary">
                  {subStatus?.promotionCode === 'FOUNDERS_50' ? 'Precio Fundadores' : 'Tarifa estándar'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 2. PRICING & PLAN COMPARISON — FREE USERS (Side-by-Side on Desktop) */}
        {!isPro && (
          <>
            <div className="text-center pt-2 space-y-1.5 px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-secondary text-text-secondary text-xs font-bold border border-border-subtle max-w-full">
                <Sparkles size={14} className="text-brand-primary shrink-0" />
                <span className="truncate">Planes y Precios</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Elige el plan ideal para tu negocio
              </h2>
            </div>

            {/* INTERVAL SELECTOR */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-2xl bg-surface-secondary border border-border-subtle p-1 gap-1">
                {(['MONTHLY', 'ANNUAL'] as BillingInterval[]).map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => {
                      setSelectedInterval(interval);
                      setCouponFeedback(null);
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedInterval === interval
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {interval === 'MONTHLY' ? 'Mensual' : 'Anual'}
                  </button>
                ))}
              </div>
            </div>

            {/* SIDE-BY-SIDE PLAN COMPARISON GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch w-full">
              {/* LEFT CARD: FREE PLAN */}
              <Card className="p-5 sm:p-6 bg-surface border border-border-default rounded-3xl flex flex-col justify-between relative w-full">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Plan Free</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Plan actual
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">Gratis</h3>
                  <p className="text-xs text-text-secondary mt-1 mb-5">
                    Todo lo necesario para empezar a operar tu negocio.
                  </p>

                  <div className="space-y-2.5 pt-4 border-t border-border-subtle">
                    {[
                      'Ventas ilimitadas',
                      'Hasta 100 productos activos',
                      'Hasta 50 clientes activos',
                      '1 usuario operativo',
                      'Reportes 7 días',
                      'Auditoría 3 días',
                      'Exportación CSV y Excel incluida',
                    ].map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-text-secondary font-medium">
                        <div className="w-4 h-4 rounded-full bg-surface-secondary text-text-tertiary flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled
                    className="w-full h-11 text-xs font-bold justify-center opacity-70 cursor-default"
                  >
                    Plan actual
                  </Button>
                </div>
              </Card>

              {/* RIGHT CARD: SEVENPOS PRO */}
              <Card className="p-5 sm:p-6 bg-surface border border-border-default rounded-3xl shadow-lg relative flex flex-col justify-between w-full">
                {pricePreview?.isFounders && (
                  <div className="absolute -top-3 right-4 sm:right-6">
                    <span className="px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-full bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 border border-neutral-700/30 dark:border-neutral-300/30 shadow-xs uppercase tracking-wider whitespace-nowrap">
                      Precio Fundadores
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      SevenPOS Pro
                      <Sparkles size={16} className="text-brand-primary" />
                    </h3>
                  </div>

                  {/* PRICE DISPLAY */}
                  <div className="space-y-1 min-h-[76px] flex flex-col justify-center mb-4">
                    {pricePreviewError ? (
                      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 space-y-2.5">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{pricePreviewError}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={fetchPricePreview}
                            className="text-xs h-8 px-3"
                          >
                            Reintentar
                          </Button>
                          <a
                            href={buildSalesWhatsAppUrl({
                              businessName: activeBusinessName,
                              countryName: country.countryName,
                              interval: selectedInterval,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-xs font-semibold text-text-primary hover:bg-surface-secondary transition-colors"
                          >
                            <MessageCircle size={13} className="text-emerald-500" />
                            <span>Hablar con ventas</span>
                          </a>
                        </div>
                      </div>
                    ) : isPricePreviewLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-9 w-44 bg-surface-secondary rounded-lg" />
                        <div className="h-4 w-64 bg-surface-secondary rounded-md" />
                      </div>
                    ) : pricePreview ? (
                      pricePreview.isFounders ? (
                        <>
                          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                            <span className="text-3xl sm:text-4xl font-extrabold text-brand-primary tracking-tight">
                              {formatCLP(pricePreview.finalNetAmount)}
                            </span>
                            <span className="text-xs text-text-tertiary">
                              + IVA / {selectedInterval === 'MONTHLY' ? 'mes' : 'año'}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary font-medium">
                            Precio Fundadores · durante los primeros {pricePreview.durationMonths || 12} meses
                          </p>
                          <p className="text-xs text-text-tertiary">
                            Después: {formatCLP(pricePreview.renewalNetAmount)} + IVA / {selectedInterval === 'MONTHLY' ? 'mes' : 'año'}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                            <span className="text-3xl sm:text-4xl font-extrabold text-brand-primary tracking-tight">
                              {formatCLP(pricePreview.finalNetAmount)}
                            </span>
                            <span className="text-xs text-text-tertiary">
                              + IVA / {selectedInterval === 'MONTHLY' ? 'mes' : 'año'}
                            </span>
                          </div>
                          {pricePreview.discountNetAmount > 0 ? (
                            <p className="text-xs text-text-secondary font-medium">
                              Descuento aplicado · Renovación: {formatCLP(pricePreview.renewalNetAmount)} + IVA
                            </p>
                          ) : (
                            <p className="text-[11px] text-text-tertiary">Precio de lanzamiento</p>
                          )}
                        </>
                      )
                    ) : null}
                  </div>

                  {/* PRO FEATURES */}
                  <div className="space-y-2.5 pt-2 border-t border-border-subtle">
                    {[
                      'Ventas ilimitadas',
                      'Productos y clientes ilimitados',
                      'Hasta 5 usuarios + Fast Switch',
                      'Historial completo en reportes y auditoría',
                      'Analítica avanzada de márgenes',
                      'Respaldos automáticos en la nube',
                    ].map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-text-primary font-medium">
                        <div className="w-4 h-4 rounded-full bg-surface-secondary text-text-primary flex items-center justify-center shrink-0 mt-0.5 border border-border-subtle">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* COUPON INPUT */}
                  <div className="pt-3 mt-4 border-t border-border-subtle w-full">
                    <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">
                      ¿Tienes un código?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponFeedback(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        placeholder="Ej: TESTAMIGO50"
                        className="w-full sm:flex-1 px-3 py-2.5 rounded-xl bg-surface-secondary border border-border-subtle text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto h-10 px-4 justify-center"
                        onClick={handleApplyCoupon}
                        disabled={isCouponLoading || !couponInput.trim()}
                      >
                        {isCouponLoading ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />}
                        Aplicar
                      </Button>
                    </div>

                    {/* Semantic Coupon Feedback */}
                    {couponFeedback && (
                      <div className={`mt-2 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        couponFeedback.reason === 'PUBLIC_PROMOTION_ALREADY_APPLIED'
                          ? 'bg-surface-secondary text-text-secondary border border-border-subtle'
                          : couponFeedback.valid
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}>
                        {couponFeedback.reason === 'PUBLIC_PROMOTION_ALREADY_APPLIED' ? (
                          <Tag size={14} className="text-text-tertiary shrink-0" />
                        ) : couponFeedback.valid ? (
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle size={14} className="text-red-500 shrink-0" />
                        )}
                        <span>
                          {couponFeedback.message ||
                            (couponFeedback.valid
                              ? `Cupón válido — ${formatCLP(pricePreview?.finalNetAmount || 0)} + IVA`
                              : 'Código no válido.')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA ACTIONS ACCORDING TO COUNTRY BILLING MODE */}
                <div className="pt-6 mt-auto space-y-2.5">
                  {billingCapability.primaryMode === 'MERCADO_PAGO' ? (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        rightIcon={<ArrowRight size={16} />}
                        className="w-full h-12 text-sm font-bold shadow-md justify-center"
                        onClick={handleShowCheckout}
                        disabled={isPricePreviewLoading || !pricePreview || !!pricePreviewError}
                      >
                        Continuar con Mercado Pago
                      </Button>

                      <a
                        href={buildSalesWhatsAppUrl({
                          businessName: activeBusinessName,
                          countryName: country.countryName,
                          interval: selectedInterval,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 rounded-2xl bg-surface-secondary border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                      >
                        <MessageCircle size={15} className="text-emerald-500" />
                        <span>Hablar con Ventas</span>
                      </a>

                      <p className="text-[10px] text-text-tertiary text-center">
                        Pago seguro procesado por Mercado Pago · Cancela en cualquier momento
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-border-subtle text-xs text-text-secondary space-y-2 text-center">
                        <p className="font-semibold text-text-primary">
                          {`Activación asistida para ${country.countryName}`}
                        </p>
                        <p className="text-[11px] text-text-tertiary leading-relaxed">
                          Te ayudaremos con la activación de SevenPOS Pro y el método de pago disponible para tu país.
                        </p>
                      </div>

                      <a
                        href={buildSalesWhatsAppUrl({
                          businessName: activeBusinessName,
                          countryName: country.countryName,
                          interval: selectedInterval,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-colors"
                      >
                        <MessageCircle size={18} />
                        <span>Contactar a Ventas por WhatsApp</span>
                      </a>
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* CHECKOUT SUMMARY MODAL */}
            {isCheckoutModalOpen && pricePreview && (
              <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-0 duration-150"
                onClick={() => !isCheckoutLoading && setIsCheckoutModalOpen(false)}
              >
                <div
                  className="w-full max-w-sm max-h-[90vh] bg-surface border border-border-default rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto animate-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-text-primary">Resumen del pedido</h3>
                    {!isCheckoutLoading && (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutModalOpen(false)}
                        className="text-text-tertiary hover:text-text-primary p-1"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-text-secondary">
                      <span>SevenPOS Pro ({selectedInterval === 'MONTHLY' ? 'Mensual' : 'Anual'})</span>
                      <span>{formatCLP(pricePreview.baseNetAmount)}</span>
                    </div>
                    {pricePreview.discountNetAmount > 0 && (
                      <div className="flex justify-between text-text-primary font-semibold">
                        <span>
                          {pricePreview.isFounders
                            ? 'Precio Fundadores'
                            : pricePreview.appliedPromotionCode
                            ? `Cupón ${pricePreview.appliedPromotionCode}`
                            : 'Descuento'}
                        </span>
                        <span>−{formatCLP(pricePreview.discountNetAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-text-secondary">
                      <span>Precio neto</span>
                      <span>{formatCLP(pricePreview.finalNetAmount)}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>IVA (19%)</span>
                      <span>{formatCLP(pricePreview.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-text-primary text-sm border-t border-border-subtle pt-2 mt-1">
                      <span>Total a pagar</span>
                      <span>{formatCLP(pricePreview.finalGrossAmount)}</span>
                    </div>
                  </div>

                  {pricePreview.isFounders && (
                    <div className="p-3 rounded-xl bg-surface-secondary border border-border-subtle text-[11px] text-text-secondary space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-text-primary"><Calendar size={12} /> Renovación automática</p>
                      <p>Meses 1–{pricePreview.durationMonths || 12}: {formatCLP(pricePreview.finalNetAmount)} + IVA</p>
                      <p>Mes 13 en adelante: {formatCLP(pricePreview.renewalNetAmount)} + IVA</p>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-surface-secondary border border-border-subtle text-[11px] text-text-secondary">
                    <p>Al continuar serás redirigido a Mercado Pago para autorizar el cobro recurrente.</p>
                    <p className="text-text-tertiary mt-1">Conexión cifrada y segura con Mercado Pago.</p>
                  </div>

                  {checkoutModalError && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle size={15} className="shrink-0 text-red-500" />
                        <span>{checkoutModalError}</span>
                      </div>
                      <a
                        href={buildSalesWhatsAppUrl({
                          businessName: activeBusinessName,
                          countryName: country.countryName,
                          interval: selectedInterval,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl bg-surface-secondary border border-border-subtle text-xs font-semibold text-text-primary hover:bg-surface-tertiary transition-colors"
                      >
                        <MessageCircle size={15} className="text-emerald-500" />
                        <span>Hablar con ventas por WhatsApp</span>
                      </a>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={isCheckoutLoading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                    className="w-full h-11 text-xs font-bold shadow-lg justify-center"
                    onClick={handleConfirmCheckout}
                    disabled={isCheckoutLoading}
                  >
                    {isCheckoutLoading ? 'Conectando con Mercado Pago…' : 'Continuar con Mercado Pago'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 3. USAGE METERS */}
        {overview && (
          <UsageMeterCard overview={overview} onUpgradeClick={() => setIsUpgradeModalOpen(true)} />
        )}

        {/* 4. PLAN COMPARISON TABLE */}
        <PlanComparisonTable />

        {/* 5. COMING SOON ROADMAP */}
        <ComingSoonRoadmap />
      </div>

      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onNavigateToSubscription={() => setIsUpgradeModalOpen(false)}
      />

      {/* CANCEL RENEWAL CONFIRMATION MODAL — replaces window.confirm */}
      {isCancelConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-0 duration-150"
          onClick={() => setIsCancelConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm max-h-[90vh] bg-surface border border-border-default rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-secondary border border-border-subtle flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">¿Cancelar la renovación?</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Conservarás el acceso Pro hasta el final del período actual. No se realizarán cobros futuros.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 justify-center"
                onClick={() => setIsCancelConfirmOpen(false)}
              >
                Mantener suscripción
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600"
                onClick={handleCancelConfirmed}
                disabled={isCancelLoading}
              >
                {isCancelLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Sí, cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OWNER RE-AUTH MODAL */}
      {isReAuthModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-0 duration-150"
          onClick={() => !reAuthLoading && setIsReAuthModalOpen(false)}
        >
          <div
            className="w-full max-w-sm max-h-[90vh] bg-surface border border-border-default rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Confirmar cuenta de propietario</h3>
              {!reAuthLoading && (
                <button
                  type="button"
                  onClick={() => setIsReAuthModalOpen(false)}
                  className="text-text-tertiary hover:text-text-primary p-1"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <p className="text-xs text-text-secondary">
              Para contratar SevenPOS Pro, confirma tu cuenta de propietario. Tus datos y ventas locales se mantienen intactos.
            </p>

            {reAuthError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{reAuthError}</span>
              </div>
            )}

            <form onSubmit={handleReAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={reAuthEmail}
                  onChange={(e) => setReAuthEmail(e.target.value)}
                  placeholder="ejemplo@negocio.cl"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-primary/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={reAuthPassword}
                  onChange={(e) => setReAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-primary/50"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsReAuthModalOpen(false)}
                  disabled={reAuthLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center shadow-lg"
                  disabled={reAuthLoading || !reAuthEmail.trim() || !reAuthPassword}
                >
                  {reAuthLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {reAuthLoading ? 'Verificando…' : 'Iniciar sesión'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
