import React, { useState } from 'react';
import { getCustomerDisplayName, DuplicateCustomerMatch } from '../../../domain/customers/Customer';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { CreateCustomer } from '../../../application/customers/CreateCustomer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { X, UserPlus, AlertTriangle, Check } from 'lucide-react';

interface PosQuickCreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customerId: string, customerName: string) => void;
}

export const PosQuickCreateCustomerModal: React.FC<PosQuickCreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const businessId = 'primary-business';

  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');

  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateCustomerMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (ignoreDuplicates: boolean = false) => {
    if (!name.trim()) {
      setErrorMessage('El nombre del cliente es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const customerRepo = repositoryFactory.getCustomerRepository();
    const useCase = new CreateCustomer(customerRepo);

    try {
      const res = await useCase.execute(
        businessId,
        {
          name: name.trim(),
          lastName: lastName.trim() || null,
          documentNumber: documentNumber.trim() || null,
          phone: phone.trim() || null,
        },
        ignoreDuplicates
      );

      if (res.duplicateWarnings.length > 0 && !ignoreDuplicates) {
        setDuplicateWarnings(res.duplicateWarnings);
        setIsSubmitting(false);
        return;
      }

      const displayName = getCustomerDisplayName(res.customer);
      onCustomerCreated(res.customer.id, displayName);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                Creación Rápida de Cliente
              </h2>
              <p className="text-[11px] text-text-secondary">
                Alta ágil para asociar de inmediato a la venta actual.
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

        {/* Form Body */}
        <div className="p-4 space-y-3.5">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Duplicate Warnings */}
          {duplicateWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-status-warning/10 border border-status-warning/30 text-text-primary text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-status-warning">
                <AlertTriangle size={15} />
                <span>Posible cliente existente</span>
              </div>
              <p className="text-text-secondary leading-relaxed">
                Coincide con: <strong>{getCustomerDisplayName(duplicateWarnings[0].customer)}</strong> ({duplicateWarnings[0].matchedValue})
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDuplicateWarnings([])}
                >
                  Modificar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                >
                  Crear de todas formas
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nombre <span className="text-status-danger">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Apellido
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej. Pérez"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Documento
              </label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="RUT / NIT"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Teléfono
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-default bg-surface-secondary/40">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit(false)}
            isLoading={isSubmitting}
            leftIcon={<Check size={14} />}
          >
            Crear y Seleccionar
          </Button>
        </div>
      </div>
    </div>
  );
};
