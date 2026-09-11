import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { CustomerWithStats, getCustomerDisplayName } from '../domain/customers/Customer';

describe('Customer Basic Export (Free Tier Standard Scope)', () => {
  const mockCustomers: CustomerWithStats[] = [
    {
      id: 'cust-1',
      businessId: 'biz-1',
      name: 'María',
      lastName: 'González',
      documentType: 'RUT',
      documentNumber: '15.234.567-8',
      phone: '+56 9 8765 4321',
      email: 'maria@example.com',
      address: 'Av. Providencia 1234',
      notes: null,
      active: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      salesCount: 5,
      totalSpent: 120000,
      lastPurchaseAt: '2026-03-05T14:30:00.000Z',
      averageTicket: 24000,
    },
    {
      id: 'cust-2',
      businessId: 'biz-1',
      name: 'Carlos',
      lastName: null,
      documentType: null,
      documentNumber: null,
      phone: '+56 9 1122 3344',
      email: null,
      address: null,
      notes: null,
      active: false,
      createdAt: '2026-02-15T08:00:00.000Z',
      updatedAt: '2026-02-15T08:00:00.000Z',
      salesCount: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
      averageTicket: 0,
    },
  ];

  it('exports only business-safe basic customer fields without internal IDs or secrets', () => {
    const headers = [
      'Nombre',
      'Documento/RUT',
      'Teléfono',
      'Correo electrónico',
      'Estado',
      'Fecha de registro',
    ];

    const rows = mockCustomers.map((c) => [
      getCustomerDisplayName(c),
      c.documentNumber || '',
      c.phone || '',
      c.email || '',
      c.active ? 'Activo' : 'Inactivo',
      c.createdAt.slice(0, 10),
    ]);

    expect(headers).toEqual([
      'Nombre',
      'Documento/RUT',
      'Teléfono',
      'Correo electrónico',
      'Estado',
      'Fecha de registro',
    ]);

    // Row 1
    expect(rows[0]).toEqual([
      'María González',
      '15.234.567-8',
      '+56 9 8765 4321',
      'maria@example.com',
      'Activo',
      '2026-03-01',
    ]);

    // Row 2 (null fields handled gracefully with empty string)
    expect(rows[1]).toEqual([
      'Carlos',
      '',
      '+56 9 1122 3344',
      '',
      'Inactivo',
      '2026-02-15',
    ]);

    // Verify XLSX generation
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
    expect(json.length).toBe(2);
    expect(json[0]['Nombre']).toBe('María González');
    expect(json[0]['Estado']).toBe('Activo');
  });
});
