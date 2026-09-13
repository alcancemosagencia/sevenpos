import React from 'react';
import { BookOpen, Search, Sparkles, ShieldCheck } from 'lucide-react';

export const HelpSupportSection: React.FC = () => {
  return (
    <div id="soporte-contacto" className="p-6 sm:p-8 bg-gradient-to-br from-surface to-surface-secondary rounded-3xl border border-border-default shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
              Centro de Ayuda y Recursos
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            ¿Tienes dudas sobre el uso de SevenPOS?
          </h2>
          <p className="text-xs sm:text-sm text-text-tertiary max-w-xl">
            Explora las guías operativas paso a paso, consulta los temas frecuentes o utiliza el buscador superior para encontrar respuestas al instante.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Guías Rápidas */}
        <div className="p-4 bg-surface rounded-2xl border border-border-default space-y-2">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <BookOpen size={18} />
          </div>
          <h3 className="text-xs font-bold text-text-primary">Guías Operativas</h3>
          <p className="text-xs text-text-secondary">Paso a paso ilustrado</p>
          <p className="text-[11px] text-text-tertiary">Aprende a usar el punto de venta, inventario y cierres de caja.</p>
        </div>

        {/* Búsqueda Inteligente */}
        <div className="p-4 bg-surface rounded-2xl border border-border-default space-y-2">
          <div className="w-9 h-9 rounded-xl bg-status-success/10 text-status-success flex items-center justify-center">
            <Search size={18} />
          </div>
          <h3 className="text-xs font-bold text-text-primary">Búsqueda Directa</h3>
          <p className="text-xs text-text-secondary">Escribe tu consulta</p>
          <p className="text-[11px] text-text-tertiary">Encuentra artículos sobre ventas, lectores, tickets y usuarios.</p>
        </div>

        {/* Canales Oficiales Próximamente */}
        <div className="p-4 bg-surface rounded-2xl border border-border-default space-y-2">
          <div className="w-9 h-9 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <h3 className="text-xs font-bold text-text-primary">Atención Directa</h3>
          <p className="text-xs text-text-secondary">Canales oficiales</p>
          <p className="text-[11px] text-text-tertiary">Canales de soporte directo próximamente disponibles.</p>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between text-xs text-text-tertiary border-t border-border-subtle">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-brand-primary" />
          SevenPOS — Sistema de Punto de Venta y Gestión Comercial
        </span>
        <span>sevenpos.pro</span>
      </div>
    </div>
  );
};
