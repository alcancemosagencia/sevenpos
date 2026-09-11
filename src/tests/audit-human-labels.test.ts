import { describe, it, expect } from 'vitest';
import {
  getHumanEventLabel,
  getHumanCategoryLabel,
  getHumanSeverityLabel,
  formatFriendlyMetadata,
} from '../application/audit/auditEventLabels';

describe('AG-12C: Human Event Labels and Metadata Formatting', () => {
  it('correctly maps raw event keys to user-friendly commercial labels', () => {
    expect(getHumanEventLabel('auth.login.success')).toBe('Acceso exitoso');
    expect(getHumanEventLabel('auth.pin.failed')).toBe('Intento de acceso fallido');
    expect(getHumanEventLabel('auth.pin.locked')).toBe('Acceso bloqueado temporalmente');
    expect(getHumanEventLabel('sale.completed')).toBe('Venta completada');
    expect(getHumanEventLabel('sale.discount.applied')).toBe('Descuento aplicado');
    expect(getHumanEventLabel('cash.shift.opened')).toBe('Caja abierta');
    expect(getHumanEventLabel('cash.shift.closed')).toBe('Caja cerrada');
    expect(getHumanEventLabel('cash.discrepancy.detected')).toBe('Diferencia al cerrar caja');
    expect(getHumanEventLabel('inventory.adjustment.created')).toBe('Ajuste de inventario');
  });

  it('correctly maps categories and severities to human labels', () => {
    expect(getHumanCategoryLabel('AUTH')).toBe('Seguridad y Acceso');
    expect(getHumanCategoryLabel('DEVICE')).toBe('Dispositivos');
    expect(getHumanCategoryLabel('SALES')).toBe('Ventas');
    expect(getHumanCategoryLabel('CASH')).toBe('Caja y Turnos');
    expect(getHumanSeverityLabel('INFO')).toBe('Informativo');
    expect(getHumanSeverityLabel('WARNING')).toBe('Advertencia');
    expect(getHumanSeverityLabel('CRITICAL')).toBe('Crítico');
  });

  it('transforms technical metadata into friendly key-value items', () => {
    const json = JSON.stringify({
      saleNumber: 'VTA-100',
      total: 25000,
      customerNameSnapshot: 'Juan Pérez',
      itemCount: 3,
      _metadataTruncated: false,
    });

    const entries = formatFriendlyMetadata(json);
    expect(entries.some((e) => e.label === 'N° de Venta' && e.value === 'VTA-100')).toBe(true);
    expect(entries.some((e) => e.label === 'Monto total' && e.value.includes('25.000'))).toBe(true);
    expect(entries.some((e) => e.label === 'Cliente' && e.value === 'Juan Pérez')).toBe(true);
    // Internal flag should be excluded
    expect(entries.some((e) => e.label.startsWith('_'))).toBe(false);
  });
});
