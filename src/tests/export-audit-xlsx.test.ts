import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';
import { AuditService } from '../application/audit/AuditService';

describe('Audit Export XLSX Structure and Data Accuracy', () => {
  it('extracts audit events with human-readable labels and exact column schema', async () => {
    const repo = new InMemoryAuditRepository();
    const service = new AuditService(repo, repo);
    const businessId = 'test-biz-export';

    await service.recordEvent({
      businessId,
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'Creación de venta',
      severity: 'INFO',
      actorNameSnapshot: 'Cajera Central',
      actorRoleSnapshot: 'Cajero',
      deviceNameSnapshot: 'POS Terminal 01',
      entityType: 'sale',
      entityId: 'sale-999',
      entityLabel: 'Boleta #B-102',
      summary: 'Venta completada por $15.000',
    });

    const { headers, rows } = await service.getExportData(businessId, {});

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
    expect(row[1]).toBe('Ventas');
    expect(row[2]).toBe('Venta completada');
    expect(row[3]).toBe('Informativo');
    expect(row[4]).toBe('Cajera Central');
    expect(row[5]).toBe('POS Terminal 01');
    expect(row[6]).toBe('Boleta #B-102');
    expect(row[7]).toBe('Venta completada por $15.000');

    // Build XLSX sheet and check SheetJS workbook representation
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');

    const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
    expect(json.length).toBe(1);
    expect(json[0]['Categoría']).toBe('Ventas');
    expect(json[0]['Usuario']).toBe('Cajera Central');
  });
});
