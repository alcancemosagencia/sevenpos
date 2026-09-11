import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AG-12C: Quality Gate — Zero Native Form Controls in Productive Code', () => {
  const srcDir = path.resolve(__dirname, '../');

  const FORBIDDEN_PATTERNS = [
    { name: '<select>', regex: /<select\b/ },
    { name: 'input[type="date"]', regex: /type=["']date["']/ },
    { name: 'window.alert', regex: /\b(window\.|globalThis\.)?alert\s*\(/ },
    { name: 'window.confirm', regex: /\b(window\.|globalThis\.)?confirm\s*\(/ },
  ];

  function getFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!item.name.includes('tests') && !item.name.includes('__tests__') && item.name !== 'node_modules') {
          results = results.concat(getFiles(full));
        }
      } else if (item.isFile() && /\.(tsx|jsx)$/.test(item.name) && !item.name.includes('.test.') && !item.name.includes('.spec.')) {
        results.push(full);
      }
    }
    return results;
  }

  it('scans all productive UI files and asserts 0 native controls', () => {
    const files = getFiles(srcDir);
    const violations: { file: string; line: number; name: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
          if (regex.test(line)) {
            violations.push({
              file: path.relative(srcDir, file),
              line: idx + 1,
              name,
            });
          }
        });
      });
    }

    expect(
      violations,
      `Productive native controls detected:\n${violations.map((v) => `  [${v.name}] ${v.file}:${v.line}`).join('\n')}`
    ).toEqual([]);
  });
});
