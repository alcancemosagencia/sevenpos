import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  ShieldCheck,
  Printer,
  Barcode,
  FolderDown,
  RefreshCw,
  X,
} from 'lucide-react';
import { databaseManager, DatabaseHealth } from '../../infrastructure/database/DatabaseManager';
import { isTauriEnvironment } from '../../infrastructure/runtime/environment';
import { windowsPrintSpikeAdapter } from '../../infrastructure/hardware/printing/WindowsPrintSpikeAdapter';
import { tauriFileSystemAdapter } from '../../infrastructure/filesystem/TauriFileSystemAdapter';
import { tauriUpdateService } from '../../infrastructure/updater/TauriUpdateService';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';

export interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScannerSimulator?: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onOpenScannerSimulator,
}) => {
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [fsStatus, setFsStatus] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [updaterStatus, setUpdaterStatus] = useState<string | null>(null);

  const refreshHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const health = await databaseManager.healthCheck();
      setDbHealth(health);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      databaseManager.healthCheck().then((health) => {
        if (isMounted) {
          setDbHealth(health);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isNative = isTauriEnvironment();

  const handleTestPrint = async (format: '80mm' | '58mm') => {
    const result = await windowsPrintSpikeAdapter.printTestPage(format);
    setPrintStatus(`Ticket ${result.targetFormat} generado vía ${result.driver} (${new Date(result.timestamp).toLocaleTimeString()})`);
  };

  const handleTestFs = async () => {
    const result = await tauriFileSystemAdapter.generateTechnicalDiagnosticFile();
    if (result.success) {
      setFsStatus(`Escrito exitoso: ${result.filePath} (${result.bytesWritten} bytes)`);
    } else {
      setFsStatus(`Error al escribir: ${result.error}`);
    }
  };

  const handleTestUpdater = async () => {
    const status = await tauriUpdateService.checkForUpdates();
    setUpdaterStatus(`Updater: ${status.supported ? 'Soportado' : 'No nativo'} • Versión: ${status.currentVersion} • ${status.error || 'Listo'}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in-0 duration-150">
      <div className="w-full max-w-2xl bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-brand-primary" />
            <h3 className="text-sm font-bold text-text-primary">
              SevenPOS Technical Diagnostics (AG-03 Core)
            </h3>
          </div>
          <IconButton variant="ghost" size="sm" ariaLabel="Cerrar modal" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Runtime & Platform Card */}
          <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-brand-primary" />
                Runtime & Plataforma
              </span>
              <Badge variant={isNative ? 'success' : 'info'}>
                {isNative ? 'Tauri 2 Native (Windows)' : 'Browser Development'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-text-secondary">
              <div>Identificador: <span className="font-mono text-text-primary">com.sevenpos.app</span></div>
              <div>Versión: <span className="font-mono text-text-primary">0.1.0</span></div>
              <div>Tipografía: <span className="font-semibold text-emerald-500">Urbanist Local (Offline)</span></div>
              <div>Secure Vault: <span className="font-semibold text-text-primary">{isNative ? 'Tauri Stronghold' : 'WebCrypto Fallback'}</span></div>
            </div>
          </div>

          {/* SQLite Database Card */}
          <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                <Database size={16} className="text-brand-primary" />
                Base de Datos SQLite
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={dbHealth?.isOpen ? 'success' : 'danger'}>
                  {dbHealth?.isOpen ? 'SQLite Conectada' : 'No Conectada'}
                </Badge>
                <Button variant="outline" size="sm" onClick={refreshHealth} disabled={isLoadingHealth} className="h-7 px-2 text-[11px]">
                  <RefreshCw size={12} className={isLoadingHealth ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>

            <div className="space-y-1 text-text-secondary font-mono">
              <div>Ruta: <span className="text-text-primary">{dbHealth?.databasePath}</span></div>
              <div>Foreign Keys: <span className={dbHealth?.foreignKeysEnabled ? 'text-emerald-500' : 'text-amber-500'}>{dbHealth?.foreignKeysEnabled ? 'ACTIVAS' : 'INACTIVAS'}</span></div>
              {dbHealth?.tables && dbHealth.tables.length > 0 && (
                <div className="pt-1">
                  <span className="text-text-tertiary">Tablas detectadas:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dbHealth.tables.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-surface-secondary text-brand-primary text-[10px] font-semibold border border-border-subtle">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dbHealth?.error && (
                <p className="text-status-danger text-[11px] pt-1">{dbHealth.error}</p>
              )}
            </div>
          </div>

          {/* Hardware Spikes Testing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Barcode Scanner Spike */}
            <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <Barcode size={16} className="text-brand-primary" />
                  Scanner Barcode
                </span>
                <Badge variant="success">Parser Listo</Badge>
              </div>
              <p className="text-text-secondary text-[11px]">
                Escucha teclas rápidas (&lt;60ms) + Enter (Keyboard Wedge).
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenScannerSimulator?.();
                }}
                className="w-full text-xs h-8 font-semibold"
              >
                Abrir Simulador / Monitor
              </Button>
            </div>

            {/* Thermal Printer Spike */}
            <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <Printer size={16} className="text-brand-primary" />
                  Impresora Térmica
                </span>
                <Badge variant="info">Spike</Badge>
              </div>
              <p className="text-text-secondary text-[11px]">
                Prueba de ticket técnico para formato 80mm y 58mm.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleTestPrint('80mm')} className="flex-1 text-xs h-8">
                  Test 80mm
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleTestPrint('58mm')} className="flex-1 text-xs h-8">
                  Test 58mm
                </Button>
              </div>
              {printStatus && <p className="text-[10px] text-emerald-500 font-mono">{printStatus}</p>}
            </div>
          </div>

          {/* Filesystem, Updater & Catalog Dev Seeds */}
          <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default space-y-2.5">
            <span className="font-bold text-text-primary flex items-center gap-1.5">
              <FolderDown size={16} className="text-brand-primary" />
              Herramientas DEV & Acciones
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleTestFs} className="text-xs h-8">
                Generar Archivo FS
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestUpdater} className="text-xs h-8">
                Verificar Updater
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { seedCatalogDevData } = await import('../../features/catalog/dev/CatalogDevSeeds');
                  const res = await seedCatalogDevData();
                  setFsStatus(res.message);
                }}
                className="text-xs h-8 text-brand-primary border-brand-primary/30"
              >
                Cargar Semillas Catálogo (DEV)
              </Button>
            </div>
            {fsStatus && <p className="text-[10px] text-emerald-500 font-mono">{fsStatus}</p>}
            {updaterStatus && <p className="text-[10px] text-text-secondary font-mono">{updaterStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
