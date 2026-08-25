import React, { useState, useEffect } from 'react';
import { Customer, getCustomerDisplayName } from '../../../domain/customers/Customer';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { SearchCustomers } from '../../../application/customers/SearchCustomers';
import { Button } from '../../../components/ui/Button';
import { X, Search, User, UserPlus, Check, Phone, FileText } from 'lucide-react';

interface PosCustomerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null, customerName: string) => void;
  onOpenQuickCreate: () => void;
}

export const PosCustomerSelectorModal: React.FC<PosCustomerSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCustomerId,
  onSelectCustomer,
  onOpenQuickCreate,
}) => {
  const businessId = 'primary-business';
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const customerRepo = repositoryFactory.getCustomerRepository();
        const searchService = new SearchCustomers(customerRepo);
        const results = await searchService.execute(businessId, searchQuery, 20);
        if (isMounted) {
          setCustomers(results);
        }
      } catch (err) {
        console.error('Error fetching customers in POS selector:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchCustomers, searchQuery ? 150 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden my-auto flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                Seleccionar Cliente
              </h2>
              <p className="text-[11px] text-text-secondary">
                Asocia la venta actual a un cliente registrado o consumidor final.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary rounded-lg hover:bg-surface transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="p-3.5 border-b border-border-default space-y-2.5 bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, documento, teléfono o correo..."
              className="w-full pl-9 pr-8 py-2 bg-surface-secondary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border-default"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSelectCustomer(null, 'Consumidor final');
                onClose();
              }}
              className="text-xs"
            >
              Consumidor final
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus size={14} />}
              onClick={() => {
                onClose();
                onOpenQuickCreate();
              }}
              className="text-xs"
            >
              Nuevo cliente
            </Button>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border-subtle">
          {/* Option: Consumidor final item */}
          <div
            onClick={() => {
              onSelectCustomer(null, 'Consumidor final');
              onClose();
            }}
            className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
              selectedCustomerId === null
                ? 'bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-semibold'
                : 'hover:bg-surface-secondary text-text-primary'
            }`}
          >
            <div>
              <p className="text-xs font-bold">Consumidor final</p>
              <p className="text-[10px] text-text-tertiary">Venta general sin registro de cliente</p>
            </div>
            {selectedCustomerId === null && <Check size={16} className="text-brand-primary shrink-0 ml-2" />}
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-text-tertiary animate-pulse">
              Buscando clientes...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-xs text-text-secondary">No se encontraron clientes para "{searchQuery}"</p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<UserPlus size={14} />}
                onClick={() => {
                  onClose();
                  onOpenQuickCreate();
                }}
              >
                Crear "{searchQuery}"
              </Button>
            </div>
          ) : (
            customers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              const displayName = getCustomerDisplayName(c);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c.id, displayName);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-semibold'
                      : 'hover:bg-surface-secondary text-text-primary'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-text-primary">{displayName}</p>
                    <div className="flex items-center gap-3 text-[10px] text-text-tertiary mt-0.5">
                      {c.documentNumber && (
                        <span className="flex items-center gap-1">
                          <FileText size={11} />
                          {c.documentNumber}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} />
                          {c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="text-brand-primary shrink-0 ml-2" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
