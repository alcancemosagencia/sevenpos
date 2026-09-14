import React from 'react';
import { Sparkles, Wand2, Globe, FileText, Bot, Cloud } from 'lucide-react';
import { Card } from '../ui/Card';

interface RoadmapItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    icon: <Wand2 size={20} className="text-brand-primary" />,
    title: 'Mejora automática de imágenes con IA',
    description: 'Remoción de fondo y optimización automática de fotos para tus catálogos y tienda online.',
  },
  {
    icon: <Globe size={20} className="text-blue-500" />,
    title: 'Tienda online pública',
    description: 'Catálogo web auto-administrado para que tus clientes descubran productos y hagan pedidos en línea.',
  },
  {
    icon: <FileText size={20} className="text-emerald-500" />,
    title: 'Facturación electrónica SII (Chile)',
    description: 'Emisión directa de boletas y facturas electrónicas integrada con el Servicio de Impuestos Internos.',
  },
  {
    icon: <Bot size={20} className="text-purple-500" />,
    title: 'Automatizaciones de inventario',
    description: 'Generación asistida de órdenes de compra al alcanzar niveles mínimos de stock.',
  },
  {
    icon: <Cloud size={20} className="text-sky-500" />,
    title: 'Sincronización en la nube multi-sucursal',
    description: 'Centralización de catálogo, stock y reportes entre múltiples locales o puntos de venta.',
  },
];

export const ComingSoonRoadmap: React.FC = () => {
  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Próximamente en SevenPOS Pro</h3>
            <p className="text-xs text-text-secondary">
              Innovaciones en desarrollo que se sumarán a tu suscripción sin costo adicional.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-bold rounded-lg bg-surface-secondary text-text-tertiary border border-border-subtle uppercase tracking-wider">
          En Desarrollo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        {ROADMAP_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-surface-secondary/40 border border-border-subtle space-y-2 hover:border-border-default transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center border border-border-subtle shadow-xs">
                {item.icon}
              </div>
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wider">
                Próximamente
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary pt-1">{item.title}</h4>
            <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
