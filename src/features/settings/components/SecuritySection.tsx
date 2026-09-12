import React, { useState } from 'react';
import { ChangePinInput } from '../types';
import { SettingRow } from './SettingRow';
import { ChangePinModal } from './ChangePinModal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Check, KeyRound, ShieldCheck } from 'lucide-react';

interface SecuritySectionProps {
  onSavePin: (input: ChangePinInput) => Promise<{ success: boolean; error?: string }>;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({ onSavePin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async (input: ChangePinInput) => {
    const res = await onSavePin(input);
    if (res.success) {
      setSuccessMessage('PIN actualizado correctamente.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
    return res;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Seguridad y Acceso</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Gestión de credenciales locales de desbloqueo y protección del terminal.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="PIN de acceso local"
          description="Código numérico de 4 dígitos requerido para desbloquear la sesión de SevenPOS y autorizar acciones protegidas."
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-3">
            <Badge variant="brand" size="md" className="flex items-center gap-1.5">
              <ShieldCheck size={14} />
              <span>Activo (4 dígitos)</span>
            </Badge>

            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<KeyRound size={14} />}
              onClick={() => setIsModalOpen(true)}
            >
              Modificar PIN
            </Button>
          </div>
        </SettingRow>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-status-success/10 border border-status-success/20 text-xs text-status-success flex items-center gap-2">
          <Check size={14} />
          {successMessage}
        </div>
      )}

      <ChangePinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
