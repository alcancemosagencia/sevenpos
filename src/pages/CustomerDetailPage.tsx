import React, { useState, useEffect, useCallback } from 'react';
import { CustomerWithStats, getCustomerDisplayName } from '../domain/customers/Customer';
import { Sale } from '../domain/sales/Sale';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { GetCustomerDetail } from '../application/customers/GetCustomerDetail';
import { DeactivateCustomer, ActivateCustomer } from '../application/customers/UpdateCustomer';
import { CustomerModal } from '../features/customers/components/CustomerModal';
import { PageContainer } from '../components/shell/PageContainer';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCountry } from '../context/CountryContext';
import { formatMoney } from '../domain/common/money/Money';
import { CurrencyCode } from '../types/country';
import {
  ArrowLeft,
  Edit2,
  Power,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  ShoppingBag,
  Receipt,
  Calendar,
  Eye,
} from 'lucide-react';

interface CustomerDetailPageProps {
  customerId: string;
  onBack: () => void;
  onNavigate: (route: string) => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({
  customerId,
  onBack,
  onNavigate,
}) => {
  const businessId = 'primary-business';
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const queryRepo = repositoryFactory.getCustomerQueryRepository();
      const detailService = new GetCustomerDetail(queryRepo);
      const res = await detailService.execute(businessId, customerId, { limit: 50 });
      if (res) {
        setCustomer(res.customer);
        setSalesHistory(res.salesHistory);
      }
    } catch (err) {
      console.error('Error loading customer detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, customerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleToggleStatus = async () => {
    if (!customer) return;
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

  if (isLoading) {
    return (
      <PageContainer>
        <div className="p-12 text-center text-xs text-text-tertiary animate-pulse">
          Cargando ficha del cliente...
        </div>
      </PageContainer>
    );
  }

  if (!customer) {
    return (
      <PageContainer>
        <div className="p-12 text-center bg-surface border border-border-default rounded-2xl shadow-xs space-y-3">
          <p className="text-sm font-bold text-text-primary">Cliente no encontrado</p>
          <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
            Volver a Clientes
          </Button>
        </div>
      </PageContainer>
    );
  }

  const displayName = getCustomerDisplayName(customer);

  return (
    <PageContainer>
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
          Volver a Clientes
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            className={customer.active ? 'hover:text-status-danger' : 'hover:text-status-success'}
            leftIcon={<Power size={14} />}
          >
            {customer.active ? 'Desactivar cliente' : 'Activar cliente'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit2 size={14} />}
          >
            Editar cliente
          </Button>
        </div>
      </div>

      {/* Customer Profile Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-default shadow-xs mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                {displayName}
              </h1>
              <Badge variant={customer.active ? 'success' : 'neutral'} size="sm">
                {customer.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Cliente desde el {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Contact Info Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border-subtle text-xs">
          {customer.documentNumber ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <FileText size={14} className="text-text-tertiary shrink-0" />
              <span>
                <strong className="text-text-primary">Doc:</strong> {customer.documentNumber}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-tertiary">
              <FileText size={14} className="shrink-0" />
              <span>Sin documento</span>
            </div>
          )}

          {customer.phone ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <Phone size={14} className="text-text-tertiary shrink-0" />
              <span>{customer.phone}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-tertiary">
              <Phone size={14} className="shrink-0" />
              <span>Sin teléfono</span>
            </div>
          )}

          {customer.email ? (
            <div className="flex items-center gap-2 text-text-secondary truncate">
              <Mail size={14} className="text-text-tertiary shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-tertiary">
              <Mail size={14} className="shrink-0" />
              <span>Sin correo</span>
            </div>
          )}

          {customer.address ? (
            <div className="flex items-center gap-2 text-text-secondary truncate">
              <MapPin size={14} className="text-text-tertiary shrink-0" />
              <span className="truncate">{customer.address}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-tertiary">
              <MapPin size={14} className="shrink-0" />
              <span>Sin dirección</span>
            </div>
          )}
        </div>

        {customer.notes && (
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border-subtle text-xs text-text-secondary">
            <strong className="text-text-primary block mb-0.5">Notas internas:</strong>
            {customer.notes}
          </div>
        )}
      </div>

      {/* Customer Metrics (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              TOTAL GASTADO
            </span>
            <div className="w-8 h-8 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success flex items-center justify-center shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary mt-2">
            {formatMoney(customer.totalSpent, currency)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              N° DE COMPRAS
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <ShoppingBag size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary mt-2">
            {customer.salesCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              TICKET PROMEDIO
            </span>
            <div className="w-8 h-8 rounded-xl bg-status-warning/10 border border-status-warning/20 text-status-warning flex items-center justify-center shrink-0">
              <Receipt size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary mt-2">
            {formatMoney(customer.averageTicket, currency)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              ÚLTIMA COMPRA
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
          </div>
          <span className="text-sm sm:text-base font-bold text-text-primary mt-2">
            {customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleDateString() : 'Sin compras'}
          </span>
        </div>
      </div>

      {/* Purchase History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary">
              Historial de Compras ({salesHistory.length})
            </h2>
            <p className="text-xs text-text-secondary">
              Registro histórico de ventas asociadas a este cliente.
            </p>
          </div>
        </div>

        {salesHistory.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border-default rounded-2xl shadow-xs space-y-2">
            <Receipt size={24} className="mx-auto text-text-tertiary" />
            <p className="text-xs text-text-secondary">Aún no se registran compras para este cliente.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-secondary/50 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <th className="py-3 px-4">N° Venta</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {salesHistory.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-text-primary">
                      {s.saleNumber}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {new Date(s.completedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={s.status === 'COMPLETED' ? 'success' : 'danger'} size="sm">
                        {s.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-text-primary">
                      {formatMoney(s.total, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigate('/sales')}
                        leftIcon={<Eye size={12} />}
                      >
                        Ver venta
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <CustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerToEdit={customer}
        onSuccess={() => loadData()}
      />
    </PageContainer>
  );
};
