import * as XLSX from 'xlsx';

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'date';
}

/**
 * Trigger a browser download of a Blob file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download an Excel (.xlsx) file with professional formatting
 */
export function downloadXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  columnWidths?: number[]
): void {
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const wb = XLSX.utils.book_new();

  // Combine headers and rows
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths if provided or calculate dynamically
  if (columnWidths && columnWidths.length > 0) {
    ws['!cols'] = columnWidths.map((w) => ({ wch: w }));
  } else {
    // Dynamic column width calculation
    const autoCols = headers.map((h, colIndex) => {
      let maxLen = h.length;
      for (const row of rows) {
        const val = row[colIndex];
        if (val !== undefined && val !== null) {
          const str = String(val);
          if (str.length > maxLen) maxLen = Math.min(str.length, 50);
        }
      }
      return { wch: Math.max(maxLen + 3, 10) };
    });
    ws['!cols'] = autoCols;
  }

  // Freeze header row and enable autofilter if range exists
  if (rows.length > 0) {
    ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${rows.length + 1}` };
    ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel max sheet name is 31 chars

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, cleanFilename);
}

/**
 * Generate and download a LATAM Excel-compatible CSV file with UTF-8 BOM and semicolon (;) delimiter.
 */
export function downloadCsvLatam(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  delimiter: ';' | ',' = ';'
): void {
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  const escapeCell = (val: string | number | boolean | null | undefined): string => {
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

  // Prefix with UTF-8 BOM (\uFEFF) for Excel detection
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  downloadBlob(blob, cleanFilename);
}

/**
 * Format a standardized filename: sevenpos_<module>_YYYY-MM-DD.<ext>
 */
export function formatExportFilename(moduleName: string, extension: 'xlsx' | 'csv'): string {
  const sanitizedModule = moduleName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');

  const todayStr = new Date().toISOString().slice(0, 10);
  return `sevenpos_${sanitizedModule}_${todayStr}.${extension}`;
}
