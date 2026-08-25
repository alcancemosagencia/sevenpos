import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { Sale } from '../domain/sales/Sale';
import { ReceiptDTO } from '../domain/sales/Receipt';
import { ListSales } from '../application/sales/ListSales';
import { GetSaleDetail } from '../application/sales/GetSaleDetail';
import { PosReceiptModal } from '../features/pos/components/PosReceiptModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingCart, Receipt, Plus } from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { useCountry } from '../context/CountryContext';
import { formatMoney } from '../domain/common/money/Money';
import { CurrencyCode } from '../types/country';

interface SalesHistoryPageProps {
  onNavigate: (route: string) => void;
}

export const SalesHistoryPage: React.FC<SalesHistoryPageProps> = ({ onNavigate }) => {
  const businessId = 'primary-business';
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const [sales, setSales] = useState<Sale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDTO | null>(null);

  const saleRepo = useMemo(() => repositoryFactory.getSaleRepository(), []);
  const businessRepo = useMemo(() => repositoryFactory.getBusinessRepository(), []);
  const listSalesUseCase = useMemo(() => new ListSales(saleRepo), [saleRepo]);
  const getSaleDetailUseCase = useMemo(() => new GetSaleDetail(saleRepo, businessRepo), [saleRepo, businessRepo]);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listSalesUseCase.execute(businessId, { limit: 50 });
      setSales(res.sales);
      setTotalCount(res.totalCount);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, listSalesUseCase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSales();
  }, [loadSales]);

  const handleViewReceipt = async (saleId: string) => {
    const detail = await getSaleDetailUseCase.execute(saleId);
    if (detail.receipt) {
      setSelectedReceipt(detail.receipt);
    }
  };

  // Metrics
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const averageTicket = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Historial de Ventas"
        subtitle="Registro cronológico de transacciones y comprobantes emitidos"
        actions={
          <Button variant="primary" size="md" leftIcon={<Plus size={16} />} onClick={() => onNavigate('/pos')}>
            Ir al Punto de Venta
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col">
          <span className="text-xs font-semibold text-text-secondary">Total Ventas Registradas</span>
          <span className="text-2xl font-extrabold text-text-primary mt-1">{totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col">
          <span className="text-xs font-semibold text-text-secondary">Recaudación Total</span>
          <span className="text-2xl font-extrabold text-brand-primary mt-1">
            {formatMoney(totalRevenue, currency)}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col">
          <span className="text-xs font-semibold text-text-secondary">Ticket Promedio</span>
          <span className="text-2xl font-extrabold text-text-primary mt-1">
            {formatMoney(averageTicket, currency)}
          </span>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-tertiary text-xs font-medium">Cargando ventas...</div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={24} />}
            title="Aún no has registrado ventas"
            description="Las ventas que completes desde el Punto de Venta aparecerán aquí automáticamente."
            action={
              <Button variant="primary" size="md" leftIcon={<Plus size={16} />} onClick={() => onNavigate('/pos')}>
                Iniciar primera venta
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-primary border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-secondary/50 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <th className="py-3.5 px-4">N° Venta</th>
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Cajero</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold font-mono text-brand-primary">
                      {s.saleNumber}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {new Date(s.completedAt).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium">{s.customerNameSnapshot}</td>
                    <td className="py-3.5 px-4 text-text-secondary">{s.createdByNameSnapshot}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-sm">
                      {formatMoney(s.total, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Receipt size={13} />}
                        onClick={() => handleViewReceipt(s.id)}
                      >
                        Comprobante
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal for reprinting */}
      <PosReceiptModal
        isOpen={Boolean(selectedReceipt)}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onNewSale={() => setSelectedReceipt(null)}
      />
    </PageContainer>
  );
};
