import { describe, it, expect } from 'vitest';
import { formatExportFilename } from '../utils/excelExportUtils';

describe('Export File Naming Conventions', () => {
  it('formats filename with standard prefix, sanitized module name, date and extension', () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    expect(formatExportFilename('clientes', 'xlsx')).toBe(`sevenpos_clientes_${todayStr}.xlsx`);
    expect(formatExportFilename('auditoria', 'xlsx')).toBe(`sevenpos_auditoria_${todayStr}.xlsx`);
    expect(formatExportFilename('auditoria', 'csv')).toBe(`sevenpos_auditoria_${todayStr}.csv`);
    expect(formatExportFilename('reporte_ventas', 'xlsx')).toBe(`sevenpos_reporte_ventas_${todayStr}.xlsx`);
  });

  it('sanitizes spaces, special characters, and accents without breaking format', () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const complexName = 'Auditoría de Cajas & Turnos';
    const filename = formatExportFilename(complexName, 'xlsx');

    expect(filename).toBe(`sevenpos_auditoria_de_cajas_turnos_${todayStr}.xlsx`);
    expect(filename).not.toMatch(/[\sÁÉÍÓÚáéíóúñ&]/);
  });
});
