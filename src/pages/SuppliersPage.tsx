import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Power,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SupplierModal } from '../features/purchases/components/SupplierModal';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../domain/purchases/Supplier';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListSuppliers } from '../application/purchases/ListSuppliers';
import { CreateSupplier } from '../application/purchases/CreateSupplier';
import { UpdateSupplier } from '../application/purchases/UpdateSupplier';
import { DeactivateSupplier, ActivateSupplier } from '../application/purchases/DeactivateSupplier';

export const SuppliersPage: React.FC = () => {
  const businessId = 'primary-business';

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const supplierRepo = repositoryFactory.getSupplierRepository();
        const listUseCase = new ListSuppliers(supplierRepo);
        const data = await listUseCase.execute(businessId, true);
        if (isMounted) {
          setSuppliers(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar proveedores.');
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [businessId, refreshTrigger]);

  const handleSaveSupplier = async (data: CreateSupplierDto | UpdateSupplierDto) => {
    const supplierRepo = repositoryFactory.getSupplierRepository();
    if (selectedSupplier) {
      const updateUseCase = new UpdateSupplier(supplierRepo);
      await updateUseCase.execute(businessId, selectedSupplier.id, data as UpdateSupplierDto);
    } else {
      const createUseCase = new CreateSupplier(supplierRepo);
      await createUseCase.execute(businessId, data as CreateSupplierDto);
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleActive = async (supplier: Supplier) => {
    const supplierRepo = repositoryFactory.getSupplierRepository();
    setActionError(null);
    try {
      if (supplier.active) {
        const deactivateUseCase = new DeactivateSupplier(supplierRepo);
        await deactivateUseCase.execute(businessId, supplier.id);
      } else {
        const activateUseCase = new ActivateSupplier(supplierRepo);
        await activateUseCase.execute(businessId, supplier.id);
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al cambiar estado del proveedor.');
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!showInactive && !s.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchTaxId = s.taxId?.toLowerCase().includes(q) || false;
      const matchContact = s.contactName?.toLowerCase().includes(q) || false;
      return matchName || matchTaxId || matchContact;
    }
    return true;
  });

  const activeCount = suppliers.filter((s) => s.active).length;
  const inactiveCount = suppliers.filter((s) => !s.active).length;

  return (
    <PageContainer maxWidth="default">
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona los proveedores comerciales y sus condiciones para órdenes de compra."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSelectedSupplier(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Nuevo proveedor</span>
          </Button>
        }
      />

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-status-danger hover:underline text-xs"
          >
            Descartar
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Proveedores Activos
            </p>
            <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Truck size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Inactivos / Deshabilitados
            </p>
            <p className="text-2xl font-bold text-text-primary">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-text-tertiary flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Total Registrados
            </p>
            <p className="text-2xl font-bold text-text-primary">{suppliers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, RUT/NIT o contacto..."
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-text-secondary font-medium cursor-pointer px-3 py-2 bg-surface-secondary border border-border-default rounded-xl hover:bg-surface-hover transition-colors">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border-strong text-brand-primary focus:ring-0"
            />
            <span>Mostrar inactivos ({inactiveCount})</span>
          </label>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-text-secondary">
          Cargando listado de proveedores...
        </div>
      ) : error ? (
        <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-danger-500 text-sm">
          {error}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<Truck size={24} />}
          title={searchQuery ? 'No se encontraron proveedores' : 'Aún no tienes proveedores'}
          description={
            searchQuery
              ? 'Intenta con otro término de búsqueda o limpia el filtro.'
              : 'Registra a tus proveedores para asociar órdenes de compra e inventario.'
          }
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Nuevo proveedor</span>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-surface border border-border-strong rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-secondary/40 text-text-tertiary text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-4">Identificación</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4">Teléfono / Email</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-surface-secondary/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{supplier.name}</div>
                      {supplier.address && (
                        <div className="text-xs text-text-tertiary truncate max-w-xs">
                          {supplier.address}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">
                      {supplier.taxId || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {supplier.contactName || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary">
                      {supplier.phone && <div>{supplier.phone}</div>}
                      {supplier.email && (
                        <div className="text-text-tertiary truncate max-w-xs">
                          {supplier.email}
                        </div>
                      )}
                      {!supplier.phone && !supplier.email && '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          supplier.active
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-text-tertiary border border-border-default'
                        }`}
                      >
                        {supplier.active ? (
                          <>
                            <CheckCircle2 size={12} /> Activo
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setIsModalOpen(true);
                          }}
                          aria-label={`Editar ${supplier.name}`}
                        >
                          <Pencil size={14} />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleActive(supplier)}
                          className={
                            supplier.active
                              ? 'hover:text-danger-500 hover:border-danger-500/30'
                              : 'hover:text-emerald-500 hover:border-emerald-500/30'
                          }
                          aria-label={supplier.active ? `Desactivar ${supplier.name}` : `Activar ${supplier.name}`}
                        >
                          <Power size={14} />
                          <span>{supplier.active ? 'Desactivar' : 'Activar'}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-text-primary text-base">{supplier.name}</h4>
                    {supplier.taxId && (
                      <p className="text-xs font-mono text-text-secondary mt-0.5">
                        {supplier.taxId}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      supplier.active
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-text-tertiary border border-border-default'
                    }`}
                  >
                    {supplier.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-text-secondary">
                  {supplier.contactName && (
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-text-tertiary" />
                      <span>{supplier.contactName}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-text-tertiary" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-text-tertiary" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-text-tertiary" />
                      <span>{supplier.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setIsModalOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Pencil size={14} />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleActive(supplier)}
                    className={`flex-1 ${
                      supplier.active
                        ? 'hover:text-danger-500'
                        : 'hover:text-emerald-500'
                    }`}
                  >
                    <Power size={14} />
                    <span>{supplier.active ? 'Desactivar' : 'Activar'}</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Supplier Form Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={selectedSupplier}
        onSave={handleSaveSupplier}
      />
    </PageContainer>
  );
};
