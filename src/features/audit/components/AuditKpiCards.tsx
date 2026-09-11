import React from 'react';
import { Shield, AlertTriangle, Activity, Lock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { AuditKpis } from '../../../domain/audit/AuditQueryRepository';

export interface AuditKpiCardsProps {
  kpis: AuditKpis | null;
  loading?: boolean;
}

export const AuditKpiCards: React.FC<AuditKpiCardsProps> = ({ kpis, loading }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Actividad reciente */}
      <Card className="p-4 flex flex-col justify-between border-border-default/80 bg-surface dark:bg-[#18181b]/95">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Actividad reciente
          </span>
          <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
            <Activity size={18} />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text-primary tracking-tight">
            {loading ? '...' : (kpis?.totalEvents24h ?? 0).toLocaleString('es-CL')}
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Eventos en las últimas 24 horas
          </p>
        </div>
      </Card>

      {/* 2. Eventos de seguridad */}
      <Card className="p-4 flex flex-col justify-between border-border-default/80 bg-surface dark:bg-[#18181b]/95">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Eventos de seguridad
          </span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Shield size={18} />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text-primary tracking-tight">
            {loading ? '...' : (kpis?.securityEventsCount ?? 0).toLocaleString('es-CL')}
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Accesos, salidas y terminales
          </p>
        </div>
      </Card>

      {/* 3. Alertas críticas */}
      <Card className="p-4 flex flex-col justify-between border-border-default/80 bg-surface dark:bg-[#18181b]/95">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Alertas críticas
          </span>
          <div className={`p-2 rounded-xl ${(kpis?.criticalEventsCount ?? 0) > 0 ? 'bg-status-danger-bg text-status-danger-text' : 'bg-surface-secondary text-text-secondary'}`}>
            <AlertTriangle size={18} />
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold tracking-tight ${(kpis?.criticalEventsCount ?? 0) > 0 ? 'text-status-danger-text' : 'text-text-primary'}`}>
            {loading ? '...' : (kpis?.criticalEventsCount ?? 0).toLocaleString('es-CL')}
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Eventos que requieren atención inmediata
          </p>
        </div>
      </Card>

      {/* 4. Intentos fallidos */}
      <Card className="p-4 flex flex-col justify-between border-border-default/80 bg-surface dark:bg-[#18181b]/95">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Intentos fallidos
          </span>
          <div className={`p-2 rounded-xl ${(kpis?.failedAttemptsCount ?? 0) > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-surface-secondary text-text-secondary'}`}>
            <Lock size={18} />
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold tracking-tight ${(kpis?.failedAttemptsCount ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'}`}>
            {loading ? '...' : (kpis?.failedAttemptsCount ?? 0).toLocaleString('es-CL')}
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Accesos no completados en el terminal
          </p>
        </div>
      </Card>
    </div>
  );
};
