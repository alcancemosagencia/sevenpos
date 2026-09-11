import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Modal Visual Consistency & Design Language Standard', () => {
  const modalFiles = [
    '../features/audit/components/ExportAuditCsvModal.tsx',
    '../features/customers/components/ExportCustomersModal.tsx',
    '../components/analytics/ExportCsvModal.tsx',
  ];

  modalFiles.forEach((relPath) => {
    const fileName = path.basename(relPath);
    it(`verifies ${fileName} uses standard dark moderate backdrop and solid surface (no aggressive blur)`, () => {
      const fullPath = path.resolve(__dirname, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check standard backdrop: bg-black/60 and backdrop-blur-none
      expect(content).toContain('bg-black/60');
      expect(content).toContain('backdrop-blur-none');
      expect(content).not.toContain('backdrop-blur-xs');
      expect(content).not.toContain('backdrop-blur-md');
      expect(content).not.toContain('backdrop-blur-lg');

      // Check standard modal surface container
      expect(content).toContain('bg-surface dark:bg-[#18181b]');
      expect(content).toContain('border border-border-default');
      expect(content).toContain('rounded-2xl');
      expect(content).toContain('shadow-xl');
    });
  });
});
