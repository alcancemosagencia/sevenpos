import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { AuditEvent, AuditCategory, AuditSeverity } from '../domain/audit/AuditEvent';
import { AuditFilters, AuditKpis } from '../domain/audit/AuditQueryRepository';
import { AuditKpiCards } from '../features/audit/components/AuditKpiCards';
import { AuditTabs, AuditTabKey } from '../features/audit/components/AuditTabs';
import { AuditFilterToolbar } from '../features/audit/components/AuditFilterToolbar';
import { AuditEventTable } from '../features/audit/components/AuditEventTable';
import { AuditEventCardsMobile } from '../features/audit/components/AuditEventCardsMobile';
import { AuditEventDetailModal } from '../features/audit/components/AuditEventDetailModal';
import { ExportAuditCsvModal } from '../features/audit/components/ExportAuditCsvModal';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';
import { DateRange } from '../application/analytics/types';
import { DateRangeSelectorPreset } from '../components/ui/DateRangeSelector';
import { UpgradePromptModal } from '../components/subscription/UpgradePromptModal';

export const AuditPage: React.FC = () => {
  const { businessId } = useAuth();

  // Subscription state
  const [currentPlan, setCurrentPlan] = useState<'FREE' | 'PRO'>('FREE');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState<string | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<AuditTabKey>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRange('TODAY'));
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState<AuditKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Derive categories list based on active tab and manual selection
  const activeFilters = useMemo((): AuditFilters => {
    let cats: AuditCategory[] | undefined = undefined;

    if (selectedCategory) {
      cats = [selectedCategory as AuditCategory];
    } else {
      if (activeTab === 'seguridad') {
        cats = ['AUTH', 'DEVICE'];
      } else if (activeTab === 'operaciones') {
        cats = ['SALES', 'CASH'];
      } else if (activeTab === 'inventario') {
        cats = ['INVENTORY', 'CATALOG'];
      }
    }

    let sev: AuditSeverity | 'ALL' | undefined = undefined;
    if (selectedSeverity) {
      sev = selectedSeverity as AuditSeverity;
    }

    return {
      categories: cats,
      severity: sev,
      searchTerm: searchTerm.trim() || undefined,
      startDate: dateRange.startDate ? `${dateRange.startDate}T00:00:00.000Z` : undefined,
      endDate: dateRange.endDate ? `${dateRange.endDate}T23:59:59.999Z` : undefined,
      limit,
      offset,
    };
  }, [activeTab, selectedCategory, selectedSeverity, searchTerm, dateRange, limit, offset]);

  const loadData = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const subRepo = repositoryFactory.getSubscriptionRepository();
      const sub = await subRepo.getSubscription(businessId);
      setCurrentPlan(sub.plan);

      const auditService = repositoryFactory.getAuditService();
      const [queryResult, kpiResult] = await Promise.all([
        auditService.queryEvents(businessId, activeFilters),
        auditService.getKpis(businessId),
      ]);

      setEvents(queryResult.items);
      setTotalCount(queryResult.totalCount);
      setKpis(kpiResult);
    } catch (err) {
      console.error('Error loading audit events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, activeFilters]);

  useEffect(() => {
    if (!businessId) {
      return;
    }
    let isCancelled = false;
    const auditService = repositoryFactory.getAuditService();

    Promise.all([
      auditService.queryEvents(businessId, activeFilters),
      auditService.getKpis(businessId),
    ])
      .then(([queryResult, kpiResult]) => {
        if (!isCancelled) {
          setEvents(queryResult.items);
          setTotalCount(queryResult.totalCount);
          setKpis(kpiResult);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Error loading audit events:', err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [businessId, activeFilters]);

  const handleTabChange = (tab: AuditTabKey) => {
    setActiveTab(tab);
    setSelectedCategory('');
    setOffset(0);
  };

  const handleSelectEvent = (event: AuditEvent) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  // Safe Guard: If businessId cannot be identified, show safe unauthenticated message without query execution
  if (!businessId) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Auditoría y Seguridad
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Revisa las acciones importantes realizadas en tu negocio.
          </p>
        </div>
        <div className="bg-surface dark:bg-[#18181b]/95 rounded-2xl border border-border-default p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-secondary text-text-secondary flex items-center justify-center mx-auto mb-3">
            <Shield size={24} />
          </div>
          <h3 className="text-base font-semibold text-text-primary">No pudimos identificar el negocio activo.</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            Por favor verifica el inicio de sesión o la vinculación del terminal.
          </p>
        </div>
      </div>
    );
  }

  const auditPresets: DateRangeSelectorPreset[] = [
    { key: 'TODAY', label: 'Hoy' },
    { key: 'YESTERDAY', label: 'Ayer' },
    {
      key: 'LAST_7_DAYS',
      label: 'Últimos 7 días',
      locked: currentPlan === 'FREE',
      badge: currentPlan === 'FREE' ? 'PRO' : undefined,
    },
    {
      key: 'LAST_30_DAYS',
      label: 'Últimos 30 días',
      locked: currentPlan === 'FREE',
      badge: currentPlan === 'FREE' ? 'PRO' : undefined,
    },
    {
      key: 'THIS_MONTH',
      label: 'Este mes',
      locked: currentPlan === 'FREE',
      badge: currentPlan === 'FREE' ? 'PRO' : undefined,
    },
    {
      key: 'LAST_MONTH',
      label: 'Mes anterior',
      locked: currentPlan === 'FREE',
      badge: currentPlan === 'FREE' ? 'PRO' : undefined,
    },
    {
      key: 'CUSTOM',
      label: 'Personalizado',
      locked: currentPlan === 'FREE',
      badge: currentPlan === 'FREE' ? 'PRO' : undefined,
    },
  ];

  const handleLockedPresetSelect = () => {
    setUpgradeModalMessage('El Plan Pro desbloquea el histórico completo de auditoría y eventos de seguridad sin límites.');
    setIsUpgradeModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Auditoría y Seguridad
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Revisa las acciones importantes realizadas en tu negocio.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <AuditKpiCards kpis={kpis} loading={isLoading} />

      {/* Tabs */}
      <AuditTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        securityCount={kpis?.securityEventsCount}
        criticalCount={kpis?.criticalEventsCount}
      />

      {/* Filter Toolbar */}
      <AuditFilterToolbar
        searchTerm={searchTerm}
        onSearchChange={(s) => {
          setSearchTerm(s);
          setOffset(0);
        }}
        activeTab={activeTab}
        selectedCategory={selectedCategory}
        onCategoryChange={(c) => {
          setSelectedCategory(c);
          setOffset(0);
        }}
        selectedSeverity={selectedSeverity}
        onSeverityChange={(s) => {
          setSelectedSeverity(s);
          setOffset(0);
        }}
        dateRange={dateRange}
        onDateRangeChange={(r) => {
          setDateRange(r);
          setOffset(0);
        }}
        presets={auditPresets}
        onLockedOptionSelect={handleLockedPresetSelect}
        onRefresh={loadData}
        onExportCsv={() => setIsExportOpen(true)}
        isLoading={isLoading}
      />

      {/* Desktop Table (active on lg >= 1024px) */}
      <div className="hidden lg:block">
        <AuditEventTable
          events={events}
          totalCount={totalCount}
          limit={limit}
          offset={offset}
          onPageChange={setOffset}
          onSelectEvent={handleSelectEvent}
          isLoading={isLoading}
        />
      </div>

      {/* Mobile & Tablet Cards (active on screens < 1024px) */}
      <div className="block lg:hidden">
        <AuditEventCardsMobile
          events={events}
          loading={isLoading}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Modals */}
      <AuditEventDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        event={selectedEvent}
      />

      <ExportAuditCsvModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        businessId={businessId}
        filters={activeFilters}
        totalEventsCount={totalCount}
        onSuccessToast={showToast}
      />

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Historial de auditoría en Plan Pro"
        message={upgradeModalMessage || 'El Plan Pro desbloquea el historial completo de eventos de auditoría y seguridad.'}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#18181b] text-white border border-border-default shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-status-success" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
