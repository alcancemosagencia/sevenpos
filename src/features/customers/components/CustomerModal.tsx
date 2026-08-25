import React, { useState, useEffect } from 'react';
import { Customer, DuplicateCustomerMatch, getCustomerDisplayName } from '../../../domain/customers/Customer';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { CreateCustomer } from '../../../application/customers/CreateCustomer';
import { UpdateCustomer } from '../../../application/customers/UpdateCustomer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { X, User, AlertTriangle, Check } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  customerToEdit?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
}) => {
  const businessId = 'primary-business';

  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('RUT');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateCustomerMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (customerToEdit) {
      setName(customerToEdit.name);
      setLastName(customerToEdit.lastName || '');
      setDocumentType(customerToEdit.documentType || 'RUT');
      setDocumentNumber(customerToEdit.documentNumber || '');
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address || '');
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setLastName('');
      setDocumentType('RUT');
      setDocumentNumber('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
    }
    setDuplicateWarnings([]);
    setErrorMessage(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (ignoreDuplicates: boolean = false) => {
    if (!name.trim()) {
      setErrorMessage('El nombre del cliente es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const customerRepo = repositoryFactory.getCustomerRepository();

    try {
      if (customerToEdit) {
        const useCase = new UpdateCustomer(customerRepo);
        const res = await useCase.execute(
          businessId,
          customerToEdit.id,
          {
            name: name.trim(),
            lastName: lastName.trim() || null,
            documentType: documentType.trim() || null,
            documentNumber: documentNumber.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          },
          ignoreDuplicates
        );

        if (res.duplicateWarnings.length > 0 && !ignoreDuplicates) {
          setDuplicateWarnings(res.duplicateWarnings);
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.customer);
      } else {
        const useCase = new CreateCustomer(customerRepo);
        const res = await useCase.execute(
          businessId,
          {
            name: name.trim(),
            lastName: lastName.trim() || null,
            documentType: documentType.trim() || null,
            documentNumber: documentNumber.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          },
          ignoreDuplicates
        );

        if (res.duplicateWarnings.length > 0 && !ignoreDuplicates) {
          setDuplicateWarnings(res.duplicateWarnings);
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.customer);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                {customerToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-xs text-text-secondary">
                {customerToEdit
                  ? `Modificando datos de ${getCustomerDisplayName(customerToEdit)}`
                  : 'Registra un cliente para asociar ventas e historial comercial.'}
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
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Duplicate Warning Prompt */}
          {duplicateWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-status-warning/10 border border-status-warning/30 text-text-primary text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-status-warning">
                <AlertTriangle size={16} />
                <span>Posible cliente duplicado encontrado</span>
              </div>
              <p className="text-text-secondary leading-relaxed">
                Encontramos coincidencias con otros clientes registrados:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-text-secondary">
                {duplicateWarnings.map((w, idx) => (
                  <li key={idx}>
                    <strong className="text-text-primary">{getCustomerDisplayName(w.customer)}</strong>{' '}
                    tiene el mismo {w.field === 'document' ? 'documento' : w.field === 'phone' ? 'teléfono' : 'email'} ({w.matchedValue}).
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2 pt-2 border-t border-status-warning/20">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDuplicateWarnings([])}
                >
                  Corregir datos
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                >
                  Guardar de todas formas
                </Button>
              </div>
            </div>
          )}

          {/* Row 1: Nombre & Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
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
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Apellido
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej. Pérez"
              />
            </div>
          </div>

          {/* Row 2: Documento & Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Documento / Identificador fiscal
              </label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ej. 12.345.678-9 / NIT"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Teléfono de contacto
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. +56 9 1234 5678"
              />
            </div>
          </div>

          {/* Row 3: Email */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Correo electrónico
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej. cliente@correo.cl"
            />
          </div>

          {/* Row 4: Dirección */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Dirección
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej. Av. Providencia 1234, Santiago"
            />
          </div>

          {/* Row 5: Notas */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Notas internas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de despacho, preferencias o condiciones especiales..."
              rows={2}
              className="w-full p-2.5 bg-surface border border-border-default rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-border-default bg-surface-secondary/40">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSubmit(false)}
            isLoading={isSubmitting}
            leftIcon={<Check size={16} />}
          >
            {customerToEdit ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </div>
      </div>
    </div>
  );
};
