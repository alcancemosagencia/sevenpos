import React from 'react';
import { Check, Minus } from 'lucide-react';
import { Card } from '../ui/Card';

interface FeatureGroup {
  name: string;
  features: {
    name: string;
    free: string | boolean;
    pro: string | boolean;
    badge?: string;
  }[];
}

const COMPARISON_GROUPS: FeatureGroup[] = [
  {
    name: 'Operación y Ventas',
    features: [
      { name: 'Ventas y tickets mensuales', free: 'Ilimitadas', pro: 'Ilimitadas' },
      { name: 'Punto de Venta (POS rápido y atajos)', free: true, pro: true },
      { name: 'Catálogo de productos', free: '100 productos', pro: 'Ilimitados' },
      { name: 'Directorio de clientes', free: '50 clientes', pro: 'Ilimitados' },
      { name: 'Control de caja y turnos', free: true, pro: true },
      { name: 'Registro de gastos operativos', free: true, pro: true },
    ],
  },
  {
    name: 'Equipo y Seguridad',
    features: [
      { name: 'Usuarios activos en el equipo', free: '1 usuario (Owner)', pro: 'Hasta 5 operadores' },
      { name: 'Roles y permisos independientes', free: false, pro: 'Owner, Admin, Cajero' },
      { name: 'Cambio rápido con PIN (Fast Switch)', free: false, pro: true },
      { name: 'Atribución de ventas por operador', free: false, pro: true },
    ],
  },
  {
    name: 'Control e Inteligencia',
    features: [
      { name: 'Resumen ejecutivo de negocio', free: true, pro: true },
      { name: 'Analítica de márgenes y utilidades', free: false, pro: true },
      { name: 'Comparativas vs período anterior', free: false, pro: true },
      { name: 'Desglose por categoría y pagos', free: false, pro: true },
    ],
  },
  {
    name: 'Historial y Exportaciones',
    features: [
      { name: 'Historial en reportes', free: '7 días', pro: 'Histórico completo' },
      { name: 'Historial en bitácora de auditoría', free: '3 días', pro: 'Histórico completo' },
      { name: 'Exportación a Excel (XLSX)', free: 'Según ventana (7d/3d)', pro: 'Histórico completo' },
      { name: 'Exportación a CSV', free: 'Según ventana (7d/3d)', pro: 'Histórico completo' },
    ],
  },
];

export const PlanComparisonTable: React.FC = () => {
  return (
    <Card className="p-5 sm:p-6 space-y-5 overflow-hidden">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <div>
          <h3 className="text-base font-bold text-text-primary">Comparativa de Planes</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Conoce en detalle las capacidades disponibles en cada plan.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 sm:mx-0">
        <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border-default">
              <th className="py-3 px-4 font-bold text-text-primary w-1/2">Funcionalidad</th>
              <th className="py-3 px-4 font-bold text-text-primary w-1/4 text-center">SevenPOS Free</th>
              <th className="py-3 px-4 font-bold text-brand-primary w-1/4 text-center bg-brand-primary/5 rounded-t-xl">
                SevenPOS Pro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {COMPARISON_GROUPS.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                <tr className="bg-surface-secondary/60">
                  <td colSpan={3} className="py-2.5 px-4 font-bold text-xs text-text-tertiary uppercase tracking-wider">
                    {group.name}
                  </td>
                </tr>
                {group.features.map((feat, fIdx) => (
                  <tr key={fIdx} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <span>{feat.name}</span>
                        {feat.badge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-brand-primary/10 text-brand-primary uppercase">
                            {feat.badge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center text-text-secondary">
                      {renderCellContent(feat.free)}
                    </td>
                    <td className="py-2.5 px-4 text-center text-text-primary font-semibold bg-brand-primary/5">
                      {renderCellContent(feat.pro, true)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

function renderCellContent(val: string | boolean, isPro: boolean = false) {
  if (typeof val === 'boolean') {
    if (val) {
      return (
        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Check size={13} strokeWidth={3} />
        </div>
      );
    }
    return (
      <div className="inline-flex items-center justify-center w-5 h-5 text-text-tertiary">
        <Minus size={15} />
      </div>
    );
  }
  return <span className={isPro ? 'text-brand-primary font-bold' : 'text-text-secondary'}>{val}</span>;
}
