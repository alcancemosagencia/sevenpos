import React, { useEffect, useState } from 'react';
import {
  Building2,
  Sparkles,
  Layers,
  Wrench,
  TrendingUp,
  Globe2,
  Activity,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { PlatformDashboardMetrics } from '../types/PlatformTypes';
import { platformAdminService } from '../services/PlatformAdminService';

interface PlatformDashboardPageProps {
  onNavigateToBusinesses: (filter?: { plan?: string; source?: string }) => void;
  onSelectBusiness: (businessId: string) => void;
}

export const PlatformDashboardPage: React.FC<PlatformDashboardPageProps> = ({
  onNavigateToBusinesses,
  onSelectBusiness,
}) => {
  const [metrics, setMetrics] = useState<PlatformDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await platformAdminService.getDashboardMetrics();
        if (isMounted) setMetrics(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar métricas.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface-secondary rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface border border-border-default rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-surface border border-border-default rounded-2xl" />
          <div className="h-72 bg-surface border border-border-default rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8 text-center bg-surface border border-border-default rounded-2xl space-y-3">
        <div className="text-error font-semibold">Error al cargar dashboard</div>
        <p className="text-xs text-text-secondary">{error || 'No se pudieron recuperar las métricas.'}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const proPercentage = metrics.totalBusinesses > 0
    ? Math.round((metrics.proActive / metrics.totalBusinesses) * 100)
    : 0;

  const freePercentage = 100 - proPercentage;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Dashboard de Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Supervisión operativa, distribución de planes y estado canónico de clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToBusinesses()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Building2 size={16} />
          <span>Ver Directorio de Negocios</span>
        </button>
      </div>

      {/* 1. TOP KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Businesses */}
        <div
          onClick={() => onNavigateToBusinesses()}
          className="p-5 bg-surface border border-border-default hover:border-border-strong rounded-2xl shadow-xs transition-all cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Negocios Totales
            </span>
            <div className="p-2 rounded-xl bg-surface-secondary text-brand-primary">
              <Building2 size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {metrics.totalBusinesses}
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center justify-between">
            <span>Registrados en SevenPOS</span>
            <ArrowRight size={13} className="text-text-tertiary" />
          </div>
        </div>

        {/* PRO Activos */}
        <div
          onClick={() => onNavigateToBusinesses({ plan: 'PRO' })}
          className="p-5 bg-surface border border-brand-primary/20 hover:border-brand-primary/40 rounded-2xl shadow-xs transition-all cursor-pointer space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
              PRO Activos
            </span>
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {metrics.proActive}
          </div>
          <div className="text-[11px] text-text-secondary flex items-center justify-between">
            <span>{proPercentage}% del total</span>
            <span className="font-semibold text-brand-primary">Ver activos &rarr;</span>
          </div>
        </div>

        {/* FREE */}
        <div
          onClick={() => onNavigateToBusinesses({ plan: 'FREE' })}
          className="p-5 bg-surface border border-border-default hover:border-border-strong rounded-2xl shadow-xs transition-all cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Negocios FREE
            </span>
            <div className="p-2 rounded-xl bg-surface-secondary text-text-secondary">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {metrics.freeActive}
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center justify-between">
            <span>{freePercentage}% del total</span>
            <ArrowRight size={13} className="text-text-tertiary" />
          </div>
        </div>

        {/* Manual Activations */}
        <div
          onClick={() => onNavigateToBusinesses({ source: 'MANUAL' })}
          className="p-5 bg-surface border border-border-default hover:border-border-strong rounded-2xl shadow-xs transition-all cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Activaciones Manuales
            </span>
            <div className="p-2 rounded-xl bg-surface-secondary text-amber-500">
              <Wrench size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {metrics.manualActive}
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center justify-between">
            <span>Cortesías / Testers / Ventas</span>
            <ArrowRight size={13} className="text-text-tertiary" />
          </div>
        </div>

      </div>

      {/* 2. VISUAL SAAS HEALTH GRID (1440px balanced layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Growth Trend (8 cols) */}
        <div className="lg:col-span-8 bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-primary" />
                <span>Crecimiento de Negocios</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Nuevos negocios registrados por mes (datos históricos canónicos).
              </p>
            </div>
            <span className="text-xs font-semibold text-text-tertiary">Últimos 6 meses</span>
          </div>

          {/* Minimalist Visual Bar Chart */}
          {metrics.growthTrend.length > 0 ? (
            <div className="pt-4 space-y-4">
              <div className="h-44 flex items-end gap-3 sm:gap-6 border-b border-border-subtle pb-2">
                {metrics.growthTrend.map((item, idx) => {
                  const maxCount = Math.max(...metrics.growthTrend.map((g) => g.count), 1);
                  const barHeight = Math.max(12, Math.round((item.count / maxCount) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-[11px] font-semibold text-text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.count}
                      </span>
                      <div className="w-full max-w-[48px] bg-surface-secondary group-hover:bg-brand-primary/20 rounded-t-lg transition-colors overflow-hidden flex items-end h-32">
                        <div
                          className="w-full bg-brand-primary rounded-t-lg transition-all duration-300"
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-text-tertiary truncate">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-tertiary">
              No hay datos históricos disponibles aún.
            </div>
          )}
        </div>

        {/* Plan Distribution (4 cols) */}
        <div className="lg:col-span-4 bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              <Layers size={18} className="text-brand-primary" />
              <span>Distribución de Planes</span>
            </h2>
            <p className="text-xs text-text-secondary">
              Relación de cuentas FREE vs PRO activas.
            </p>
          </div>

          {/* Clean Segmented Progress Bar */}
          <div className="space-y-4 py-2">
            <div className="h-4 w-full bg-surface-secondary rounded-full overflow-hidden flex">
              <div
                className="bg-brand-primary transition-all duration-300"
                style={{ width: `${proPercentage}%` }}
                title={`PRO: ${metrics.proActive}`}
              />
              <div
                className="bg-slate-300 dark:bg-slate-700 transition-all duration-300"
                style={{ width: `${freePercentage}%` }}
                title={`FREE: ${metrics.freeActive}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs text-brand-primary font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                  <span>PRO</span>
                </div>
                <div className="text-xl font-bold text-text-primary mt-1">
                  {metrics.proActive}
                </div>
                <div className="text-[10px] text-text-tertiary">{proPercentage}% de cuentas</div>
              </div>

              <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                  <span>FREE</span>
                </div>
                <div className="text-xl font-bold text-text-primary mt-1">
                  {metrics.freeActive}
                </div>
                <div className="text-[10px] text-text-tertiary">{freePercentage}% de cuentas</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-text-tertiary border-t border-border-subtle pt-3">
            El modelo de suscripción canónico no cuenta accesos de cortesía como ingresos recurrentes.
          </div>
        </div>

      </div>

      {/* 3. PRO SOURCES & COUNTRY DISTRIBUTION & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRO Origin Breakdown & Country (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* PRO Billing Source Distribution */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                <CreditCard size={18} className="text-brand-primary" />
                <span>Origen de Cuentas PRO</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Desglose por canal de facturación canónico.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-text-primary">Mercado Pago (Pagadas)</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{metrics.mercadopagoActive}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-text-primary">Manual (Cortesía / Tester / Asistida)</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{metrics.manualActive}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-semibold text-text-primary">Promocional / Interno</span>
                </div>
                <span className="text-sm font-bold text-text-primary">
                  {metrics.promotionalActive + metrics.internalActive}
                </span>
              </div>
            </div>
          </div>

          {/* Country Distribution */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                <Globe2 size={18} className="text-brand-primary" />
                <span>Distribución por País</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Presencia de negocios por país registrado.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {metrics.countryDistribution.map((c) => (
                <div key={c.country_code} className="p-3 bg-surface-secondary rounded-xl border border-border-subtle text-center">
                  <span className="text-xs font-bold text-text-secondary uppercase">
                    {c.country_code === 'CL' ? '🇨🇱 Chile' : c.country_code === 'VE' ? '🇻🇪 Venezuela' : c.country_code === 'CO' ? '🇨🇴 Colombia' : c.country_code}
                  </span>
                  <div className="text-xl font-bold text-text-primary mt-1">{c.count}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Recent Platform Activity (6 cols) */}
        <div className="lg:col-span-6 bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              <Activity size={18} className="text-brand-primary" />
              <span>Actividad Administrativa Reciente</span>
            </h2>
            <p className="text-xs text-text-secondary">
              Registro auditado de activaciones y cambios de suscripción.
            </p>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {metrics.recentActivity.length > 0 ? (
              metrics.recentActivity.map((act) => (
                <div
                  key={act.id}
                  onClick={() => act.businessId && onSelectBusiness(act.businessId)}
                  className={`p-3 bg-surface-secondary hover:bg-surface-hover border border-border-subtle rounded-xl flex items-start justify-between gap-3 transition-colors ${
                    act.businessId ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-brand-primary/10 text-brand-primary uppercase">
                        {act.action.replace(/_/g, ' ')}
                      </span>
                      {act.businessName && (
                        <span className="text-xs font-bold text-text-primary truncate">
                          {act.businessName}
                        </span>
                      )}
                    </div>
                    {act.reason && (
                      <p className="text-[11px] text-text-secondary truncate">
                        Motivo: {act.reason}
                      </p>
                    )}
                    <div className="text-[10px] text-text-tertiary">
                      {act.adminEmail && <span>Por {act.adminEmail} &bull; </span>}
                      <span>{new Date(act.createdAt).toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                  {act.businessId && (
                    <ArrowRight size={14} className="text-text-tertiary shrink-0 mt-1" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-xs text-text-tertiary">
                No hay eventos administrativos registrados recientemente.
              </div>
            )}
          </div>

          <div className="text-[11px] text-text-tertiary border-t border-border-subtle pt-3 flex items-center justify-between">
            <span>Historial inmutable de auditoría</span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
        </div>

      </div>

    </div>
  );
};
