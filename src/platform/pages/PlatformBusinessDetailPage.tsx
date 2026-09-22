import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  Sparkles,
  Smartphone,
  Users,
  History,
  CreditCard,
  CheckCircle2,
  Wrench,
  Bug,
  RefreshCw,
  Globe,
  Settings,
} from 'lucide-react';
import { PlatformBusinessDetail } from '../types/PlatformTypes';
import { platformAdminService } from '../services/PlatformAdminService';
import { ManualProActivationModal } from '../components/ManualProActivationModal';
import { EndManualProModal } from '../components/EndManualProModal';
import { EditBusinessRegionModal } from '../components/EditBusinessRegionModal';
import { COUNTRY_PROFILES } from '../../config/countries';
import { SupportedCountryCode } from '../../types/country';

interface PlatformBusinessDetailPageProps {
  businessId: string;
  onBack: () => void;
}

type DetailTab = 'overview' | 'subscription' | 'usage' | 'activity' | 'diagnostic';

export const PlatformBusinessDetailPage: React.FC<PlatformBusinessDetailPageProps> = ({
  businessId,
  onBack,
}) => {
  const [detail, setDetail] = useState<PlatformBusinessDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Modals
  const [isActivateOpen, setIsActivateOpen] = useState<boolean>(false);
  const [isEndProOpen, setIsEndProOpen] = useState<boolean>(false);
  const [isEditRegionOpen, setIsEditRegionOpen] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await platformAdminService.getBusinessDetail(businessId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalle del negocio.');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    let isMounted = true;
    platformAdminService.getBusinessDetail(businessId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar detalle del negocio.');
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse font-sans">
        <div className="h-8 w-48 bg-surface-secondary rounded-xl" />
        <div className="h-32 bg-surface border border-border-default rounded-2xl" />
        <div className="h-64 bg-surface border border-border-default rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 text-center bg-surface border border-border-default rounded-2xl space-y-3 font-sans">
        <div className="text-error font-semibold">Error al cargar negocio</div>
        <p className="text-xs text-text-secondary">{error || 'Negocio no encontrado.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border-default rounded-xl text-xs font-semibold cursor-pointer"
        >
          Volver al directorio
        </button>
      </div>
    );
  }

  const isPro = detail.subscription.planCode === 'PRO' && detail.subscription.status === 'ACTIVE';
  const isManual = detail.subscription.billingSource === 'MANUAL';
  const isMercadoPago = detail.subscription.billingSource === 'MERCADO_PAGO';

  const tabs: Array<{ id: DetailTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Resumen', icon: <Building2 size={15} /> },
    { id: 'subscription', label: 'Suscripción', icon: <CreditCard size={15} /> },
    { id: 'usage', label: 'Dispositivos y Equipo', icon: <Smartphone size={15} /> },
    { id: 'activity', label: 'Auditoría', icon: <History size={15} /> },
    { id: 'diagnostic', label: 'Diagnóstico', icon: <Bug size={15} /> },
  ];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Volver al Directorio de Negocios</span>
        </button>

        <button
          type="button"
          onClick={() => fetchDetail()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border-default rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Flatter PageHeader Surface */}
      <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">
                {detail.business.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isPro
                    ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30'
                    : 'bg-surface-secondary text-text-secondary border border-border-subtle'
                }`}
              >
                {isPro && <Sparkles size={12} />}
                <span>Plan {detail.subscription.planCode}</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-secondary text-text-secondary uppercase">
                {detail.business.countryCode}
              </span>
            </div>

            <div className="text-xs text-text-secondary flex flex-wrap items-center gap-3">
              <span><strong>ID:</strong> <code className="text-text-tertiary">{detail.business.id}</code></span>
              <span>&bull;</span>
              <span><strong>Dueño:</strong> {detail.owner.email}</span>
              <span>&bull;</span>
              <span><strong>Registrado:</strong> {new Date(detail.business.createdAt).toLocaleDateString('es-CL')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {isPro && isManual && (
              <button
                type="button"
                onClick={() => setIsEndProOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-error hover:bg-error/10 border border-error/20 rounded-xl transition-colors cursor-pointer"
              >
                Finalizar Acceso PRO
              </button>
            )}

            {isPro && isMercadoPago ? (
              <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>PRO Activo (Mercado Pago)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsActivateOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>{isPro ? 'Modificar Plan PRO' : 'Activar Plan PRO'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Tab Navigation (Flat border style) */}
        <div className="flex items-center gap-1 border-t border-border-subtle pt-3 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-surface-secondary text-brand-primary font-bold border border-border-default'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT AREAS */}

      {/* 1. RESUMEN (Overview & Definition List) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Business Info */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-[11px] text-text-tertiary">
              Información del Negocio
            </h2>
            <dl className="divide-y divide-border-subtle text-xs">
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">Nombre Comercial</dt>
                <dd className="font-semibold text-text-primary">{detail.business.name}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">País de Operación</dt>
                <dd className="font-semibold text-text-primary">{detail.business.countryCode}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">UUID del Negocio</dt>
                <dd className="font-mono text-[11px] text-text-tertiary">{detail.business.id}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">Fecha de Creación</dt>
                <dd className="text-text-primary">{new Date(detail.business.createdAt).toLocaleString('es-CL')}</dd>
              </div>
            </dl>
          </div>

          {/* Owner Info */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-[11px] text-text-tertiary">
              Propietario / Cuenta Cloud
            </h2>
            <dl className="divide-y divide-border-subtle text-xs">
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">Nombre Completo</dt>
                <dd className="font-semibold text-text-primary">{detail.owner.name || 'Propietario'}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">Correo Electrónico</dt>
                <dd className="font-semibold text-text-primary">{detail.owner.email}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">Auth User ID</dt>
                <dd className="font-mono text-[11px] text-text-tertiary">{detail.owner.userId}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-text-secondary font-medium">Fecha de Registro</dt>
                <dd className="text-text-primary">{new Date(detail.owner.createdAt).toLocaleString('es-CL')}</dd>
              </div>
            </dl>
          </div>

          {/* Regional Configuration */}
          {(() => {
            const countryProfile = COUNTRY_PROFILES[(detail.business.countryCode as SupportedCountryCode) || 'CL'] || COUNTRY_PROFILES.CL;
            return (
              <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-brand-primary" />
                    <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-[11px] text-text-tertiary">
                      Configuración Regional &amp; Moneda
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditRegionOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border-default rounded-xl text-xs font-semibold text-text-primary transition-colors cursor-pointer"
                  >
                    <Settings size={13} />
                    <span>Editar Configuración Regional</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
                    <div className="text-[11px] text-text-tertiary">País Configurado</div>
                    <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                      <span>{countryProfile.flag}</span>
                      <span>{countryProfile.countryName} ({detail.business.countryCode})</span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
                    <div className="text-[11px] text-text-tertiary">Moneda Principal</div>
                    <div className="font-bold text-text-primary text-sm">
                      {countryProfile.primaryCurrency.code} ({countryProfile.primaryCurrency.symbol})
                    </div>
                  </div>

                  <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
                    <div className="text-[11px] text-text-tertiary">Régimen Fiscal</div>
                    <div className="font-semibold text-text-primary">
                      {countryProfile.taxName} ({countryProfile.defaultTaxRate}%)
                    </div>
                  </div>

                  <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
                    <div className="text-[11px] text-text-tertiary">Prefijo Telefónico</div>
                    <div className="font-semibold text-text-primary">
                      {countryProfile.phonePrefix}
                    </div>
                  </div>
                </div>

                {detail.business.countryCode === 'VE' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0 text-amber-600" />
                    <span>
                      <strong>Régimen Bimonetario Activo:</strong> Este negocio opera con moneda base en Bolívares (VES) y soporte nativo secundario en Dólares (USD) con conversión mediante tasa de cambio BCV.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* 2. SUSCRIPCIÓN (Canonical Subscription Detail) */}
      {activeTab === 'subscription' && (
        <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-text-primary">
                Estado Canónico de Suscripción
              </h2>
              <p className="text-xs text-text-secondary">
                Información persistida en la nube y sincronizada con el motor de facturación.
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-surface-secondary border border-border-subtle rounded-xl font-bold">
              Origen: {detail.subscription.billingSource}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <div className="text-[11px] font-semibold text-text-secondary">Plan Actual</div>
              <div className="text-xl font-bold text-text-primary">{detail.subscription.planCode}</div>
              <div className="text-[10px] text-text-tertiary">Estado: {detail.subscription.status}</div>
            </div>

            <div className="p-4 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <div className="text-[11px] font-semibold text-text-secondary">Intervalo de Facturación</div>
              <div className="text-xl font-bold text-text-primary">
                {detail.subscription.billingInterval || 'N/A'}
              </div>
              <div className="text-[10px] text-text-tertiary">
                {detail.subscription.cancelAtPeriodEnd ? 'Cancelación solicitada' : 'Renovación automática'}
              </div>
            </div>

            <div className="p-4 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <div className="text-[11px] font-semibold text-text-secondary">Vigencia del Período</div>
              <div className="text-sm font-bold text-text-primary">
                {detail.subscription.currentPeriodEnd
                  ? new Date(detail.subscription.currentPeriodEnd).toLocaleDateString('es-CL')
                  : 'Sin término fijo'}
              </div>
              <div className="text-[10px] text-text-tertiary">
                Inicio: {detail.subscription.currentPeriodStart ? new Date(detail.subscription.currentPeriodStart).toLocaleDateString('es-CL') : '—'}
              </div>
            </div>
          </div>

          {/* Manual Metadata (If source is MANUAL) */}
          {detail.subscription.billingSource === 'MANUAL' && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
              <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                <Wrench size={14} />
                <span>Detalles de Activación Manual</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><strong>Motivo:</strong> {detail.subscription.manualReason || 'No especificado'}</div>
                <div><strong>Activado por:</strong> {detail.subscription.activatedByEmail || 'Admin'}</div>
                <div><strong>Fecha Activación:</strong> {detail.subscription.manualActivatedAt ? new Date(detail.subscription.manualActivatedAt).toLocaleString('es-CL') : '—'}</div>
                <div><strong>Nota Interna:</strong> {detail.subscription.manualNotes || 'Sin notas'}</div>
              </div>
            </div>
          )}

          {/* Active Contract Info */}
          {detail.activeContract && (
            <div className="p-4 bg-surface-secondary rounded-xl border border-border-subtle space-y-2 text-xs">
              <div className="font-bold text-text-primary">Términos del Contrato Activo (Inmutable)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-text-secondary">
                <div>Versión: {detail.activeContract.pricingVersion}</div>
                <div>Monto Bruto: ${detail.activeContract.finalGrossAmount.toLocaleString('es-CL')} {detail.activeContract.currency}</div>
                <div>ID Contrato: <code className="text-[10px]">{detail.activeContract.id}</code></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. USO / DISPOSITIVOS Y EQUIPO */}
      {activeTab === 'usage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Devices List */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Smartphone size={16} className="text-brand-primary" />
                <span>Terminales Enrolados</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-surface-secondary rounded-md">
                {detail.devices.length}
              </span>
            </h2>

            {detail.devices.length > 0 ? (
              <div className="divide-y divide-border-subtle">
                {detail.devices.map((dev) => (
                  <div key={dev.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-text-primary">{dev.deviceName}</div>
                      <div className="text-[10px] text-text-tertiary">
                        {dev.platform} &bull; {dev.deviceType} &bull; Visto: {new Date(dev.lastSeenAt).toLocaleString('es-CL')}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dev.revokedAt ? 'bg-error/10 text-error' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {dev.revokedAt ? 'Revocado' : 'Activo'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary py-4 text-center">No hay terminales enrolados.</p>
            )}
          </div>

          {/* Members List */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-brand-primary" />
                <span>Equipo y Membresías Cloud</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-surface-secondary rounded-md">
                {detail.members.length}
              </span>
            </h2>

            {detail.members.length > 0 ? (
              <div className="divide-y divide-border-subtle">
                {detail.members.map((mem) => (
                  <div key={mem.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-text-primary">
                        {mem.email || (mem.firstName ? `${mem.firstName} ${mem.lastName || ''}` : 'Usuario')}
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        Rol: <strong>{mem.role}</strong> &bull; Creado: {new Date(mem.createdAt).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-secondary text-text-secondary">
                      {mem.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary py-4 text-center">No hay miembros registrados.</p>
            )}
          </div>

        </div>
      )}

      {/* 4. AUDITORÍA (Admin Activity Log) */}
      {activeTab === 'activity' && (
        <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <History size={16} className="text-brand-primary" />
              <span>Registro de Modificaciones Administrativas</span>
            </h2>
            <span className="text-xs text-text-tertiary">Auditoría inmutable</span>
          </div>

          {detail.adminEvents.length > 0 ? (
            <div className="space-y-3">
              {detail.adminEvents.map((evt) => (
                <div key={evt.id} className="p-3.5 bg-surface-secondary rounded-xl border border-border-subtle text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-primary uppercase text-[10px] px-2 py-0.5 bg-brand-primary/10 rounded-md">
                      {evt.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(evt.createdAt).toLocaleString('es-CL')}
                    </span>
                  </div>
                  {evt.reason && (
                    <div className="text-text-primary font-medium">Motivo: {evt.reason}</div>
                  )}
                  <div className="text-[10px] text-text-tertiary">
                    Administrador: {evt.adminEmail || 'Admin'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-tertiary">
              No hay eventos administrativos registrados para este negocio.
            </div>
          )}
        </div>
      )}

      {/* 5. DIAGNÓSTICO (Super Admin Entitlement Diagnostic) */}
      {activeTab === 'diagnostic' && (
        <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-brand-primary border-b border-border-subtle pb-3">
            <Bug size={18} />
            <h2 className="text-sm font-bold text-text-primary">
              Bloque de Diagnóstico Interno de Entitlements
            </h2>
          </div>

          <p className="text-xs text-text-secondary">
            Este bloque expone la verdad factual de la base de datos para diagnosticar discrepancias entre el estado canónico y la resolución en el cliente SevenPOS.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Cloud Business UUID</span>
              <div className="font-mono text-[11px] font-bold text-text-primary break-all">{detail.diagnostic.cloudBusinessId || detail.business.id}</div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">País Canónico / Configurado</span>
              <div className="font-bold text-text-primary">
                {detail.diagnostic.canonicalCountry || detail.business.countryCode} {detail.diagnostic.resolvedLocalCountry ? `(Local: ${detail.diagnostic.resolvedLocalCountry})` : ''}
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Moneda Canónica / Local</span>
              <div className="font-bold text-text-primary">
                {detail.diagnostic.canonicalCurrency || (COUNTRY_PROFILES[(detail.business.countryCode as SupportedCountryCode) || 'CL']?.primaryCurrency.code ?? 'CLP')} {detail.diagnostic.resolvedLocalCurrency ? `(Local: ${detail.diagnostic.resolvedLocalCurrency})` : ''}
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Suscripción Canónica (BD)</span>
              <div className="font-bold text-text-primary">{detail.diagnostic.canonicalPlan} ({detail.diagnostic.canonicalStatus})</div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Origen de Facturación Canónico</span>
              <div className="font-bold text-text-primary">{detail.diagnostic.canonicalSource}</div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Fila en business_subscriptions</span>
              <div className="font-bold text-text-primary">
                {detail.diagnostic.subscriptionRowExists ? 'Presente' : 'No existe (Default FREE)'}
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Contrato Activo Vinculado</span>
              <div className="font-bold text-text-primary">
                {detail.diagnostic.hasActiveContract ? 'Sí (billing_contracts)' : 'No'}
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Entitlement Esperado en App</span>
              <div className="font-bold text-brand-primary">{detail.diagnostic.resolvedEntitlementPlan || 'No disponible'}</div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Membresía Propietario (RLS Key)</span>
              <div className="font-bold text-text-primary break-all">
                {detail.owner.userId ? `ID: ${detail.owner.userId}` : 'Sin dueño'}
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Fuente del Repositorio</span>
              <div className="font-semibold text-text-primary">
                {detail.diagnostic.repositorySource || 'CloudSubscriptionRepository (PostgreSQL)'}
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle space-y-1">
              <span className="text-text-tertiary text-[11px]">Estado de Hidratación Cloud</span>
              <div className="font-semibold text-emerald-600">
                {detail.diagnostic.lastHydrationStatus || 'Sincronizado'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ManualProActivationModal
        businessId={detail.business.id}
        businessName={detail.business.name}
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        onSuccess={() => fetchDetail()}
      />

      <EndManualProModal
        businessId={detail.business.id}
        businessName={detail.business.name}
        isOpen={isEndProOpen}
        onClose={() => setIsEndProOpen(false)}
        onSuccess={() => fetchDetail()}
      />

      <EditBusinessRegionModal
        businessId={detail.business.id}
        businessName={detail.business.name}
        currentCountryCode={detail.business.countryCode}
        isOpen={isEditRegionOpen}
        onClose={() => setIsEditRegionOpen(false)}
        onSuccess={() => fetchDetail()}
      />

    </div>
  );
};
