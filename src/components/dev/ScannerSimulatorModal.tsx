import React, { useState, useEffect } from 'react';
import { Barcode, Play, X, CheckCircle2, History } from 'lucide-react';
import { keyboardWedgeScanner, ScanResult } from '../../infrastructure/hardware/scanner/KeyboardWedgeScanner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';

export interface ScannerSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerSimulatorModal: React.FC<ScannerSimulatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [testCode, setTestCode] = useState('7501234567890');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    keyboardWedgeScanner.startListening();

    const unsubscribe = keyboardWedgeScanner.onScan((result) => {
      setLastScan(result);
      setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
    });

    return () => {
      unsubscribe();
      keyboardWedgeScanner.stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode.trim()) return;
    const result = keyboardWedgeScanner.simulateScan(testCode.trim());
    setLastScan(result);
    setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in-0 duration-150">
      <div className="w-full max-w-xl bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <Barcode size={20} className="text-brand-primary" />
            <h3 className="text-sm font-bold text-text-primary">
              Barcode Scanner Spike & Simulator
            </h3>
          </div>
          <IconButton variant="ghost" size="sm" ariaLabel="Cerrar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Active Listening Banner */}
          <div className="p-3 rounded-[var(--radius-card)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} />
            <span>Escucha de Keyboard Wedge activa en este momento. Si dispone de un lector USB físico, dispare cualquier código.</span>
          </div>

          {/* Simulator Form */}
          <form onSubmit={handleSimulate} className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default space-y-3">
            <h4 className="text-xs font-bold text-text-primary">Simular Ráfaga de Scanner USB</h4>
            <div className="flex gap-2">
              <Input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Código de barras..."
                className="flex-1 font-mono text-sm"
              />
              <Button type="submit" variant="brand" size="md" leftIcon={<Play size={14} />}>
                Disparar
              </Button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTestCode('7501234567890')}
                className="text-[11px] text-brand-primary underline hover:text-brand-hover cursor-pointer"
              >
                EAN-13 (7501234567890)
              </button>
              <span className="text-text-tertiary">•</span>
              <button
                type="button"
                onClick={() => setTestCode('7801234567897')}
                className="text-[11px] text-brand-primary underline hover:text-brand-hover cursor-pointer"
              >
                Chile (7801234567897)
              </button>
              <span className="text-text-tertiary">•</span>
              <button
                type="button"
                onClick={() => setTestCode('7701234567894')}
                className="text-[11px] text-brand-primary underline hover:text-brand-hover cursor-pointer"
              >
                Colombia (7701234567894)
              </button>
            </div>
          </form>

          {/* Last Detected Scan Card */}
          {lastScan && (
            <div className="p-4 rounded-[var(--radius-card)] bg-surface-secondary border border-border-default space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary">Último Código Detectado</span>
                <Badge variant="success">{lastScan.method}</Badge>
              </div>
              <div className="text-2xl font-bold font-mono tracking-wider text-brand-primary">
                {lastScan.barcode}
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-text-secondary pt-1 border-t border-border-subtle">
                <div>Caracteres: <span className="text-text-primary">{lastScan.charCount}</span></div>
                <div>Duración: <span className="text-text-primary">{lastScan.durationMs}ms</span></div>
                <div>Intervalo prom.: <span className="text-text-primary">{lastScan.averageIntervalMs}ms</span></div>
              </div>
            </div>
          )}

          {/* History */}
          {scanHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-text-primary">
                <History size={14} className="text-brand-primary" />
                Historial Reciente de Lecturas
              </div>
              <div className="space-y-1 font-mono">
                {scanHistory.map((s, idx) => (
                  <div
                    key={`${s.timestamp}-${idx}`}
                    className="p-2 rounded-[var(--radius-control)] bg-surface border border-border-subtle flex items-center justify-between text-[11px]"
                  >
                    <span className="font-bold text-text-primary">{s.barcode}</span>
                    <span className="text-text-tertiary text-[10px]">
                      {s.charCount} chars • {s.durationMs}ms ({new Date(s.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
