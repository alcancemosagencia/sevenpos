import React from 'react';
import { Search, Download, RefreshCw } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FilterToolbar } from '../../../components/ui/FilterToolbar';
import { Select, SelectOption } from '../../../components/ui/Select';
import { DateRangePickerDropdown } from '../../../components/analytics/DateRangePickerDropdown';
import { DateRange } from '../../../application/analytics/types';
import { AuditTabKey } from './AuditTabs';

export interface AuditFilterToolbarProps {
  searchTerm: string;
  onSearchChange: (search: string) => void;
  activeTab: AuditTabKey;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedSeverity: string;
  onSeverityChange: (severity: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading?: boolean;
}

export const AuditFilterToolbar: React.FC<AuditFilterToolbarProps> = ({
  searchTerm,
  onSearchChange,
  activeTab,
  selectedCategory,
  onCategoryChange,
  selectedSeverity,
  onSeverityChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onExportCsv,
  isLoading,
}) => {
  // Category options based on active tab
  const categoryOptions: SelectOption[] = React.useMemo(() => {
    if (activeTab === 'seguridad') {
      return [
        { value: '', label: 'Todas las de seguridad' },
        { value: 'AUTH', label: 'Seguridad y Acceso' },
        { value: 'DEVICE', label: 'Dispositivos' },
      ];
    }
    if (activeTab === 'operaciones') {
      return [
        { value: '', label: 'Todas las de operaciones' },
        { value: 'SALES', label: 'Ventas' },
        { value: 'CASH', label: 'Caja y Turnos' },
      ];
    }
    if (activeTab === 'inventario') {
      return [
        { value: '', label: 'Todas las de inventario' },
        { value: 'INVENTORY', label: 'Inventario' },
        { value: 'CATALOG', label: 'Catálogo' },
      ];
    }
    return [
      { value: '', label: 'Todas las categorías' },
      { value: 'AUTH', label: 'Seguridad y Acceso' },
      { value: 'DEVICE', label: 'Dispositivos' },
      { value: 'SALES', label: 'Ventas' },
      { value: 'CASH', label: 'Caja y Turnos' },
      { value: 'INVENTORY', label: 'Inventario' },
      { value: 'CATALOG', label: 'Catálogo' },
      { value: 'PURCHASES', label: 'Compras' },
      { value: 'EXPENSES', label: 'Gastos' },
      { value: 'CUSTOMERS', label: 'Clientes' },
      { value: 'SETTINGS', label: 'Configuración' },
      { value: 'SYSTEM', label: 'Sistema' },
    ];
  }, [activeTab]);

  const severityOptions: SelectOption[] = [
    { value: '', label: 'Todas las severidades' },
    { value: 'INFO', label: 'Informativo' },
    { value: 'WARNING', label: 'Advertencia' },
    { value: 'CRITICAL', label: 'Crítico' },
  ];

  return (
    <FilterToolbar className="mb-4">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Buscar por acción, usuario o detalle..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search size={16} className="text-text-secondary" />}
          className="w-full bg-surface"
        />
      </div>

      {/* Filters & Actions Grid / Stack */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Date Range Picker */}
        <DateRangePickerDropdown
          currentRange={dateRange}
          onRangeChange={onDateRangeChange}
        />

        {/* Category Non-Native Select */}
        <Select
          options={categoryOptions}
          value={selectedCategory}
          onChange={onCategoryChange}
          placeholder="Categoría"
          className="w-auto min-w-[150px]"
        />

        {/* Severity Non-Native Select */}
        <Select
          options={severityOptions}
          value={selectedSeverity}
          onChange={onSeverityChange}
          placeholder="Severidad"
          className="w-auto min-w-[140px]"
        />

        {/* Refresh button */}
        <Button
          variant="secondary"
          size="md"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 shrink-0"
          title="Actualizar eventos"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </Button>

        {/* Export button */}
        <Button
          variant="secondary"
          size="md"
          onClick={onExportCsv}
          leftIcon={<Download size={15} />}
          className="font-medium whitespace-nowrap shrink-0 text-xs sm:text-sm"
        >
          Exportar
        </Button>
      </div>
    </FilterToolbar>
  );
};
