import React, { useState, useEffect, useCallback } from 'react';
import { Customer, CustomerWithStats, CustomerMetrics, getCustomerDisplayName } from '../domain/customers/Customer';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListCustomers } from '../application/customers/ListCustomers';
import { GetCustomerMetrics } from '../application/customers/GetCustomerMetrics';
import { DeactivateCustomer, ActivateCustomer } from '../application/customers/UpdateCustomer';
import { CustomerKpiCards } from '../features/customers/components/CustomerKpiCards';
import { CustomerModal } from '../features/customers/components/CustomerModal';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCountry } from '../context/CountryContext';
import { formatMoney } from '../domain/common/money/Money';
import { CurrencyCode } from '../types/country';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  Power,
  Phone,
  Mail,
} from 'lucide-react';

interface CustomersPageProps {
  onNavigate: (route: string) => void;
  onSelectCustomerDetail?: (customerId: string) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onNavigate,
  onSelectCustomerDetail,
}) => {
  const businessId = 'primary-business';
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    activeCustomersCount: 0,
    newCustomersThisMonthCount: 0,
    customersWithPurchasesCount: 0,
    globalAverageTicketPerCustomer: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const loadData = useCallback(async () => {
    try {
      const queryRepo = repositoryFactory.getCustomerQueryRepository();
      const listService = new ListCustomers(queryRepo);
      const metricsService = new GetCustomerMetrics(queryRepo);

      const [custList, kpis] = await Promise.all([
        listService.execute(businessId, searchQuery),
        metricsService.execute(businessId),
      ]);

      setCustomers(custList);
      setMetrics(kpis);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (customer: CustomerWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    const customerRepo = repositoryFactory.getCustomerRepository();
    try {
      if (customer.active) {
        const useCase = new DeactivateCustomer(customerRepo);
        await useCase.execute(businessId, customer.id);
      } else {
        const useCase = new ActivateCustomer(customerRepo);
        await useCase.execute(businessId, customer.id);
      }
      await loadData();
    } catch (err) {
      console.error('Error toggling customer status:', err);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === 'ACTIVE') return c.active;
    if (statusFilter === 'INACTIVE') return !c.active;
    return true;
  });

  const handleOpenDetail = (customerId: string) => {
    if (onSelectCustomerDetail) {
      onSelectCustomerDetail(customerId);
    } else {
      onNavigate(`/customers/${customerId}`);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        subtitle="Gestiona tu cartera de clientes, historial de compras y métricas de fidelización."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setCustomerToEdit(null);
              setIsModalOpen(true);
            }}
          >
            Nuevo cliente
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="my-6">
        <CustomerKpiCards metrics={metrics} />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, RUT/documento, teléfono..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border-default rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-primary shadow-xs transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="inline-flex p-1 rounded-xl bg-surface border border-border-default shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Todos ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Activos ({customers.filter((c) => c.active).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Inactivos ({customers.filter((c) => !c.active).length})
            </button>
          </div>
        </div>
      </div>

      {/* Content Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-surface border border-border-default rounded-2xl shadow-xs text-xs text-text-tertiary animate-pulse">
          Cargando listado de clientes...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border-default rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-secondary flex items-center justify-center mx-auto text-text-tertiary">
            <Users size={24} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-text-primary">
            {searchQuery ? 'No se encontraron clientes' : 'Aún no tienes clientes registrados'}
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {searchQuery
              ? 'Prueba con otro término de búsqueda o limpia los filtros.'
              : 'Registra tus clientes habituales para asociar ventas y conocer su historial.'}
          </p>
          {!searchQuery && (
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => {
                setCustomerToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-2"
            >
              Nuevo cliente
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-secondary/50 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Documento</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4 text-center">Compras</th>
                  <th className="py-3.5 px-4 text-right">Total Gastado</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredCustomers.map((c) => {
                  const displayName = getCustomerDisplayName(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenDetail(c.id)}
                      className="hover:bg-surface-secondary/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-text-primary block hover:text-brand-primary transition-colors">
                            {displayName}
                          </span>
                          {c.lastPurchaseAt && (
                            <span className="text-[10px] text-text-tertiary">
                              Última compra: {new Date(c.lastPurchaseAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-text-secondary">
                        {c.documentNumber ? (
                          <span className="font-mono text-[11px]">{c.documentNumber}</span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-text-secondary">
                        <div className="space-y-0.5">
                          {c.phone && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Phone size={11} className="text-text-tertiary" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Mail size={11} className="text-text-tertiary" />
                              <span className="truncate max-w-[150px]">{c.email}</span>
                            </div>
                          )}
                          {!c.phone && !c.email && <span className="text-text-tertiary">—</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-text-primary">
                        {c.salesCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                        {formatMoney(c.totalSpent, currency)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={c.active ? 'success' : 'neutral'} size="sm">
                          {c.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDetail(c.id)}
                            leftIcon={<Eye size={13} />}
                          >
                            Detalle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCustomerToEdit(c);
                              setIsModalOpen(true);
                            }}
                            aria-label="Editar"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleToggleStatus(c, e)}
                            className={c.active ? 'hover:text-status-danger' : 'hover:text-status-success'}
                            aria-label={c.active ? 'Desactivar' : 'Activar'}
                          >
                            <Power size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (390px / 768px) */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((c) => {
              const displayName = getCustomerDisplayName(c);
              return (
                <div
                  key={c.id}
                  onClick={() => handleOpenDetail(c.id)}
                  className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{displayName}</h4>
                      {c.documentNumber && (
                        <span className="text-[11px] font-mono text-text-secondary block">
                          {c.documentNumber}
                        </span>
                      )}
                    </div>
                    <Badge variant={c.active ? 'success' : 'neutral'} size="sm">
                      {c.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle text-xs">
                    <div>
                      <span className="text-[10px] text-text-tertiary block">Compras</span>
                      <span className="font-semibold text-text-primary">{c.salesCount} ventas</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-text-tertiary block">Total gastado</span>
                      <span className="font-bold text-text-primary">{formatMoney(c.totalSpent, currency)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDetail(c.id)}
                      leftIcon={<Eye size={13} />}
                      className="text-xs"
                    >
                      Ver detalle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomerToEdit(c);
                        setIsModalOpen(true);
                      }}
                      className="text-xs"
                    >
                      <Edit2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerToEdit={customerToEdit}
        onSuccess={() => loadData()}
      />
    </PageContainer>
  );
};
