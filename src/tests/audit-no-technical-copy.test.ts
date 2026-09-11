import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AG-12C: Zero Technical Jargon in Client-Facing Audit Components', () => {
  const auditComponentsDir = path.resolve(__dirname, '../features/audit/components');
  const auditPageFile = path.resolve(__dirname, '../pages/AuditPage.tsx');

  const FORBIDDEN_WORDS = [
    'Inmutable',
    'Append-Only',
    'Append-Only Guard',
    'Correlation ID',
    'JSON Sanitizado',
    'Metadatos Estructurados',
    'Event ID',
    'Local-First',
    'SQLite',
    'RPC',
  ];

  it('ensures no forbidden technical phrases exist in rendered UI strings', () => {
    const filesToScan = fs
      .readdirSync(auditComponentsDir)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => path.join(auditComponentsDir, f));
    filesToScan.push(auditPageFile);

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf8');
      for (const word of FORBIDDEN_WORDS) {
        // Regex checking for word not inside an import or type declaration comment
        const wordRegex = new RegExp(`>[^<]*\\b${word}\\b[^<]*<`, 'i');
        const match = content.match(wordRegex);
        expect(
          match,
          `Found forbidden technical jargon "${word}" in ${path.basename(file)}: ${match ? match[0] : ''}`
        ).toBeNull();
      }
    }
  });
});
