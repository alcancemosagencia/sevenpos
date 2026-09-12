import { describe, it, expect } from 'vitest';
import {
  getHumanEventLabel,
  getHumanCategoryLabel,
  getHumanSeverityLabel,
  formatFriendlyMetadata,
} from '../application/audit/auditEventLabels';
import { AuditService } from '../application/audit/AuditService';
import { AuditQueryRepository, AuditQueryResult } from '../domain/audit/AuditQueryRepository';
import { AuditEvent } from '../domain/audit/AuditEvent';

describe('UX-HOTFIX-02A: Human Event Labels, Category Copy, and Fallback Safety', () => {
  it('correctly maps settings.currency_updated to "Tasa de cambio actualizada"', () => {
    expect(getHumanEventLabel('settings.currency_updated')).toBe('Tasa de cambio actualizada');
  });

  it('correctly maps SETTINGS category to "Configuración"', () => {
    expect(getHumanCategoryLabel('SETTINGS')).toBe('Configuración');
  });

  it('correctly maps all canonical operational and security event keys', () => {
    expect(getHumanEventLabel('auth.login.success')).toBe('Acceso exitoso');
    expect(getHumanEventLabel('auth.pin.failed')).toBe('Intento de acceso fallido');
    expect(getHumanEventLabel('auth.pin.locked')).toBe('Acceso bloqueado temporalmente');
    expect(getHumanEventLabel('auth.logout')).toBe('Cierre de sesión');
    expect(getHumanEventLabel('device.enrolled')).toBe('Nuevo dispositivo configurado');
    expect(getHumanEventLabel('sale.completed')).toBe('Venta completada');
    expect(getHumanEventLabel('sale.discount.applied')).toBe('Descuento aplicado');
    expect(getHumanEventLabel('cash.shift.opened')).toBe('Caja abierta');
    expect(getHumanEventLabel('cash.shift.closed')).toBe('Caja cerrada');
    expect(getHumanEventLabel('cash.discrepancy.detected')).toBe('Diferencia al cerrar caja');
    expect(getHumanEventLabel('cash.movement.created')).toBe('Movimiento de caja registrado');
    expect(getHumanEventLabel('inventory.adjustment.created')).toBe('Ajuste de inventario');
    expect(getHumanEventLabel('product.created')).toBe('Producto creado');
    expect(getHumanEventLabel('product.updated')).toBe('Producto actualizado');
    expect(getHumanEventLabel('customer.created')).toBe('Cliente registrado');
    expect(getHumanEventLabel('customer.updated')).toBe('Cliente actualizado');
    expect(getHumanEventLabel('settings.business_updated')).toBe('Datos del negocio actualizados');
    expect(getHumanEventLabel('settings.currency_updated')).toBe('Tasa de cambio actualizada');
    expect(getHumanEventLabel('settings.pos_updated')).toBe('Preferencias de punto de venta actualizadas');
    expect(getHumanEventLabel('settings.printing_updated')).toBe('Configuración de impresión actualizada');
    expect(getHumanEventLabel('settings.inventory_updated')).toBe('Políticas de inventario actualizadas');
    expect(getHumanEventLabel('auth.pin.changed')).toBe('PIN de acceso modificado');
  });

  it('correctly maps all 11 canonical category enums without exposing raw enum strings', () => {
    expect(getHumanCategoryLabel('AUTH')).toBe('Seguridad y Acceso');
    expect(getHumanCategoryLabel('DEVICE')).toBe('Seguridad y Acceso');
    expect(getHumanCategoryLabel('SALES')).toBe('Ventas');
    expect(getHumanCategoryLabel('CASH')).toBe('Caja y Turnos');
    expect(getHumanCategoryLabel('INVENTORY')).toBe('Inventario');
    expect(getHumanCategoryLabel('CATALOG')).toBe('Catálogo');
    expect(getHumanCategoryLabel('PURCHASES')).toBe('Compras');
    expect(getHumanCategoryLabel('EXPENSES')).toBe('Gastos');
    expect(getHumanCategoryLabel('CUSTOMERS')).toBe('Clientes');
    expect(getHumanCategoryLabel('SETTINGS')).toBe('Configuración');
    expect(getHumanCategoryLabel('SYSTEM')).toBe('Sistema');
  });

  it('applies safe fallback "Actividad registrada" when eventType is unknown (NO raw key leaked)', () => {
    const unknownKey = 'unknown.future.internal_event_99';
    const label = getHumanEventLabel(unknownKey);
    expect(label).toBe('Actividad registrada');
    expect(label).not.toContain('unknown');
    expect(label).not.toContain('future');
    expect(label).not.toContain('internal_event');
  });

  it('applies safe fallback "General" when category is unknown (NO raw enum leaked)', () => {
    const unknownCat = 'UNKNOWN_ENUM_XYZ';
    const label = getHumanCategoryLabel(unknownCat);
    expect(label).toBe('General');
    expect(label).not.toBe(unknownCat);
  });

  it('ensures CSV and XLSX export data contains human labels instead of raw keys and enums', async () => {
    const mockEvents: AuditEvent[] = [
      {
        id: 'ae-settings-01',
        businessId: 'biz-test-01',
        eventCategory: 'SETTINGS',
        eventType: 'settings.currency_updated',
        action: 'SETTINGS_UPDATE',
        severity: 'WARNING',
        actorUserId: 'usr-1',
        actorNameSnapshot: 'Omar Dueño',
        actorRoleSnapshot: 'Dueño',
        deviceId: 'dev-1',
        deviceNameSnapshot: 'Caja 1',
        entityType: 'SETTINGS',
        entityId: 'biz-test-01',
        entityLabel: 'Configuración Moneda',
        summary: 'Tasa de cambio manual actualizada: USD a CLP 965.50',
        metadataJson: JSON.stringify({ previousRate: 950, newRate: 965.5 }),
        occurredAt: '2026-09-11T12:00:00.000Z',
        createdAt: '2026-09-11T12:00:00.000Z',
      },
    ];

    expect(getHumanSeverityLabel('WARNING')).toBe('Advertencia');

    const mockQueryRepo: AuditQueryRepository = {
      query: async (): Promise<AuditQueryResult> => ({
        items: mockEvents,
        totalCount: 1,
      }),
      getKpis: async () => ({
        totalEvents24h: 1,
        securityEventsCount: 0,
        criticalEventsCount: 0,
        failedAttemptsCount: 0,
      }),
      getById: async () => mockEvents[0],
      getByCorrelationId: async () => mockEvents,
    };

    const mockAuditRepo = {
      append: async () => mockEvents[0],
      appendBatch: async () => mockEvents,
    };
    const auditService = new AuditService(mockAuditRepo, mockQueryRepo);

    const { headers, rows } = await auditService.getExportData('biz-test-01', {});

    expect(headers).toEqual([
      'Fecha y Hora',
      'Categoría',
      'Evento',
      'Severidad',
      'Usuario',
      'Dispositivo',
      'Elemento',
      'Resumen',
    ]);

    expect(rows.length).toBe(1);
    const row = rows[0];

    // Categoría must be 'Configuración', NOT 'SETTINGS'
    expect(row[1]).toBe('Configuración');
    expect(row[1]).not.toBe('SETTINGS');

    // Evento must be 'Tasa de cambio actualizada', NOT 'settings.currency_updated'
    expect(row[2]).toBe('Tasa de cambio actualizada');
    expect(row[2]).not.toBe('settings.currency_updated');

    // Severidad must be 'Advertencia', NOT 'WARNING'
    expect(row[3]).toBe('Advertencia');
    expect(row[3]).not.toBe('WARNING');
  });

  it('transforms technical metadata including settings exchange rates into friendly key-value items', () => {
    const json = JSON.stringify({
      previousRate: 950,
      newRate: 965.5,
      provider: 'MANUAL',
      saleNumber: 'VTA-100',
      total: 25000,
      _internalFlag: true,
    });

    const entries = formatFriendlyMetadata(json);
    expect(entries.some((e) => e.label === 'Tasa anterior' && e.value === '950')).toBe(true);
    expect(entries.some((e) => e.label === 'Nueva tasa' && (e.value.includes('965,5') || e.value.includes('965.5')))).toBe(true);
    expect(entries.some((e) => e.label === 'Proveedor' && e.value === 'MANUAL')).toBe(true);
    expect(entries.some((e) => e.label === 'N° de Venta' && e.value === 'VTA-100')).toBe(true);
    expect(entries.some((e) => e.label.startsWith('_'))).toBe(false);
  });
});
