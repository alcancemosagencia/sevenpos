import React, { useState } from 'react';
import { DeviceSettingsData } from '../types';
import { SettingRow } from './SettingRow';
import { Badge } from '../../../components/ui/Badge';
import { isTauriEnvironment } from '../../../infrastructure/runtime/environment';
import { Monitor, Tablet, Smartphone, Globe, Copy, Check } from 'lucide-react';

interface DeviceSectionProps {
  deviceData: DeviceSettingsData;
}

export const DeviceSection: React.FC<DeviceSectionProps> = ({ deviceData }) => {
  const [copied, setCopied] = useState(false);
  const isTauri = isTauriEnvironment();

  const getDeviceIcon = () => {
    switch (deviceData.deviceType) {
      case 'TABLET':
        return <Tablet size={16} />;
      case 'MOBILE':
        return <Smartphone size={16} />;
      case 'WEB':
        return <Globe size={16} />;
      case 'DESKTOP':
      default:
        return <Monitor size={16} />;
    }
  };

  const shortId =
    deviceData.deviceId.length > 12
      ? `${deviceData.deviceId.slice(0, 8)}...`
      : deviceData.deviceId;

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deviceData.deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Dispositivo</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Información y estado del terminal físico donde se ejecuta esta sesión.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Nombre del terminal"
          description="Identificador descriptivo de esta estación de trabajo en el sistema."
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-2">
            <span className="text-sm font-bold text-text-primary">{deviceData.displayName}</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Tipo y plataforma"
          description="Plataforma y tipo de equipo para adaptar la visualización."
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-2">
            <Badge variant="neutral" size="md" className="flex items-center gap-1.5 font-medium">
              {getDeviceIcon()}
              <span>
                {deviceData.deviceType} · {deviceData.platform}
              </span>
            </Badge>
          </div>
        </SettingRow>

        <SettingRow
          label="Estado de conexión"
          description={
            isTauri
              ? 'Este terminal puede seguir funcionando aunque pierda temporalmente la conexión.'
              : 'Estás utilizando SevenPOS desde el navegador.'
          }
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-2">
            <Badge
              variant={isTauri ? 'brand' : 'neutral'}
              size="md"
              className="flex items-center gap-1.5 font-medium"
            >
              {isTauri && <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />}
              <span>{isTauri ? 'Disponible sin conexión' : 'Sesión web'}</span>
            </Badge>
          </div>
        </SettingRow>

        <SettingRow
          label="Identificador de terminal"
          description="Identificador de este terminal."
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-2">
            <code className="text-xs font-mono bg-surface-secondary px-2.5 py-1 rounded-md text-text-secondary border border-border-default">
              {shortId}
            </code>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1.5 rounded-md hover:bg-surface-secondary text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title="Copiar identificador completo"
            >
              {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
            </button>
          </div>
        </SettingRow>
      </div>
    </div>
  );
};
