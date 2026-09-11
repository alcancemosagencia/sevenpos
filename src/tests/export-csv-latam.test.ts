import { describe, it, expect } from 'vitest';

describe('CSV LATAM Export Formatting & Delimiter', () => {
  it('formats rows using semicolon delimiter for Excel LATAM compatibility (CL, CO, VE)', () => {
    const headers = ['Nombre', 'RUT', 'Total'];
    const rows = [
      ['Juan Pérez', '12.345.678-9', 15000],
      ['Comercial "Los Álamos"; SpA', '76.543.210-K', 32500],
    ];

    const delimiter = ';';
    const escapeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCell).join(delimiter);
    const dataLines = rows.map((row) => row.map(escapeCell).join(delimiter));
    const csvContent = [headerLine, ...dataLines].join('\r\n');
    expect(csvContent).toContain('Nombre;RUT;Total');

    expect(headerLine).toBe('Nombre;RUT;Total');
    expect(dataLines[0]).toBe('Juan Pérez;12.345.678-9;15000');
    // Embedded semicolon and quotes are properly escaped with double quotes
    expect(dataLines[1]).toBe('"Comercial ""Los Álamos""; SpA";76.543.210-K;32500');

    // Splitting by semicolon results in exact columns
    const parsedColumnsFirstRow = dataLines[0].split(';');
    expect(parsedColumnsFirstRow.length).toBe(3);
    expect(parsedColumnsFirstRow[0]).toBe('Juan Pérez');
    expect(parsedColumnsFirstRow[1]).toBe('12.345.678-9');
    expect(parsedColumnsFirstRow[2]).toBe('15000');
  });
});
