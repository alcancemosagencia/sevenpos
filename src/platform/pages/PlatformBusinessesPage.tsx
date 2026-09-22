import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  Users,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PlatformBusinessListItem } from '../types/PlatformTypes';
import { platformAdminService } from '../services/PlatformAdminService';

interface PlatformBusinessesPageProps {
  onSelectBusiness: (businessId: string) => void;
  initialFilter?: { plan?: string; source?: string };
}

export const PlatformBusinessesPage: React.FC<PlatformBusinessesPageProps> = ({
  onSelectBusiness,
  initialFilter,
}) => {
  const [items, setItems] = useState<PlatformBusinessListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>(initialFilter?.plan || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>(initialFilter?.source || 'ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  const fetchBusinesses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await platformAdminService.listBusinesses({
        search: search.trim() || undefined,
        plan: planFilter !== 'ALL' ? planFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        country: countryFilter !== 'ALL' ? countryFilter : undefined,
        page,
        pageSize,
      });

      setItems(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar negocios.');
    } finally {
      setIsLoading(false);
    }
  }, [search, planFilter, statusFilter, sourceFilter, countryFilter, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    platformAdminService.listBusinesses({
      search: search.trim() || undefined,
      plan: planFilter !== 'ALL' ? planFilter : undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
      country: countryFilter !== 'ALL' ? countryFilter : undefined,
      page,
      pageSize,
    })
      .then((res) => {
        if (isMounted) {
          setItems(res.items);
          setTotalCount(res.totalCount);
          setTotalPages(res.totalPages);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar negocios.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [search, planFilter, statusFilter, sourceFilter, countryFilter, page, pageSize]);

  const planOptions = [
    { value: 'ALL', label: 'Todos los Planes' },
    { value: 'PRO', label: 'Plan PRO' },
    { value: 'FREE', label: 'Plan FREE' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'Todos los Estados' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'PAST_DUE', label: 'En mora (Past Due)' },
    { value: 'EXPIRED', label: 'Expiradas' },
    { value: 'PENDING', label: 'Pendientes' },
  ];

  const sourceOptions = [
    { value: 'ALL', label: 'Todos los Orígenes' },
    { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
    { value: 'MANUAL', label: 'Manual (Cortesía / Tester)' },
    { value: 'PROMOTIONAL', label: 'Promocional' },
    { value: 'INTERNAL', label: 'Interno' },
    { value: 'NONE', label: 'Sin facturación (NONE)' },
  ];

  const countryOptions = [
    { value: 'ALL', label: 'Todos los Países' },
    { value: 'CL', label: '🇨🇱 Chile' },
    { value: 'VE', label: '🇻🇪 Venezuela' },
    { value: 'CO', label: '🇨🇴 Colombia' },
  ];

  const getSourceBadge = (source: string, reason?: string | null) => {
    switch (source) {
      case 'MERCADO_PAGO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Mercado Pago
          </span>
        );
      case 'MANUAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20" title={reason || 'Manual'}>
            Manual {reason ? `(${reason})` : ''}
          </span>
        );
      case 'PROMOTIONAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
            Promo
          </span>
        );
      case 'INTERNAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            Interno
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-secondary text-text-tertiary">
            Sin facturación
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Directorio de Negocios
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Supervisa cuentas, estados de suscripción y accesos de clientes en SevenPOS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchBusinesses()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-hover border border-border-default rounded-xl text-xs font-semibold text-text-primary transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Flat Toolbar: Search & Filters */}
      <div className="bg-surface border border-border-default rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          
          {/* Search Box (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por negocio, email o ID..."
              leftIcon={<Search size={16} />}
              className="w-full text-xs"
            />
          </div>

          {/* Plan Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              options={planOptions}
              value={planFilter}
              onChange={(v) => {
                setPlanFilter(v);
                setPage(1);
              }}
              className="w-full"
              buttonClassName="w-full text-xs"
            />
          </div>

          {/* Source Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              options={sourceOptions}
              value={sourceFilter}
              onChange={(v) => {
                setSourceFilter(v);
                setPage(1);
              }}
              className="w-full"
              buttonClassName="w-full text-xs"
            />
          </div>

          {/* Country Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              options={countryOptions}
              value={countryFilter}
              onChange={(v) => {
                setCountryFilter(v);
                setPage(1);
              }}
              className="w-full"
              buttonClassName="w-full text-xs"
            />
          </div>

          {/* Status Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              className="w-full"
              buttonClassName="w-full text-xs"
            />
          </div>

        </div>

        {/* Active Filters count */}
        <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
          <span>
            Mostrando {items.length} de {totalCount} negocios encontrados
          </span>
          {(search || planFilter !== 'ALL' || statusFilter !== 'ALL' || sourceFilter !== 'ALL' || countryFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPlanFilter('ALL');
                setStatusFilter('ALL');
                setSourceFilter('ALL');
                setCountryFilter('ALL');
                setPage(1);
              }}
              className="text-brand-primary hover:underline font-semibold cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-2xl text-xs text-error font-medium">
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-surface border border-border-default rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary/70 border-b border-border-default text-text-secondary uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Negocio</th>
                <th className="py-3 px-4">Propietario</th>
                <th className="py-3 px-4">País</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Origen</th>
                <th className="py-3 px-4">Dispositivos / Usuarios</th>
                <th className="py-3 px-4">Registro</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-tertiary">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-brand-primary" />
                      <span>Cargando negocios...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-tertiary">
                    No se encontraron negocios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                items.map((b) => {
                  const isPro = b.planCode === 'PRO' && b.subscriptionStatus === 'ACTIVE';
                  return (
                    <tr
                      key={b.businessId}
                      onClick={() => onSelectBusiness(b.businessId)}
                      className="hover:bg-surface-hover/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-brand-primary shrink-0" />
                          <span className="truncate max-w-[200px]">{b.businessName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        <div className="truncate max-w-[180px] font-medium text-text-primary">
                          {b.ownerEmail || '—'}
                        </div>
                        <div className="text-[10px] text-text-tertiary truncate">
                          {b.ownerName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-text-secondary uppercase">
                        {b.countryCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPro
                              ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30'
                              : 'bg-surface-secondary text-text-secondary border border-border-subtle'
                          }`}
                        >
                          {isPro && <Sparkles size={11} />}
                          <span>{b.planCode}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getSourceBadge(b.billingSource, b.manualReason)}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1" title="Dispositivos activos">
                            <Smartphone size={13} className="text-text-tertiary" />
                            <span>{b.activeDevicesCount}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Usuarios en equipo">
                            <Users size={13} className="text-text-tertiary" />
                            <span>{b.activeMembersCount}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-text-tertiary">
                        {new Date(b.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBusiness(b.businessId);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View (Strictly 1 card per business, no horizontal overflow at 390px) */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-text-tertiary">
            Cargando negocios...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-tertiary bg-surface border border-border-default rounded-2xl">
            No se encontraron negocios.
          </div>
        ) : (
          items.map((b) => {
            const isPro = b.planCode === 'PRO' && b.subscriptionStatus === 'ACTIVE';
            return (
              <div
                key={b.businessId}
                onClick={() => onSelectBusiness(b.businessId)}
                className="p-4 bg-surface border border-border-default rounded-2xl shadow-xs space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-primary truncate">
                      {b.businessName}
                    </h3>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {b.ownerEmail}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isPro
                        ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30'
                        : 'bg-surface-secondary text-text-secondary border border-border-subtle'
                    }`}
                  >
                    {isPro && <Sparkles size={11} />}
                    <span>{b.planCode}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-tertiary uppercase">{b.countryCode}</span>
                    <span>&bull;</span>
                    {getSourceBadge(b.billingSource, b.manualReason)}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {new Date(b.createdAt).toLocaleDateString('es-CL')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between bg-surface border border-border-default rounded-2xl p-4">
        <div className="text-xs text-text-secondary">
          Página <span className="font-semibold text-text-primary">{page}</span> de{' '}
          <span className="font-semibold text-text-primary">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="p-2 rounded-xl border border-border-default hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-text-primary"
            title="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="p-2 rounded-xl border border-border-default hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-text-primary"
            title="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
};
