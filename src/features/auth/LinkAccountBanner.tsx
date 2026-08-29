import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface LinkAccountBannerProps {
  onOpenLinkModal: () => void;
}

export const LinkAccountBanner: React.FC<LinkAccountBannerProps> = ({ onOpenLinkModal }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-brand-primary/15 via-surface-secondary to-surface border-b border-brand-primary/20 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 text-text-primary min-w-0">
        <div className="w-7 h-7 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
          <ShieldAlert size={16} />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-text-primary">Protege y vincula tu negocio: </span>
          <span className="text-text-secondary">
            Vincula este negocio a tu cuenta SevenPOS para poder acceder desde otros dispositivos sin perder tus datos locales.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="brand"
          size="sm"
          onClick={onOpenLinkModal}
          rightIcon={<ArrowRight size={13} />}
          className="font-bold text-xs"
        >
          Vincular cuenta
        </Button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          title="Ocultar por ahora"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
