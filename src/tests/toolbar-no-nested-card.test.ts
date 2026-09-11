import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Design System Rule: TOOLBAR != CARD', () => {
  it('verifies AuditFilterToolbar does not contain card wrapper classes (bg-surface / rounded-2xl / border wrapper)', () => {
    const filePath = path.resolve(__dirname, '../features/audit/components/AuditFilterToolbar.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Rule: Must use FilterToolbar and NOT an outer card wrapper
    expect(content).toContain('<FilterToolbar');
    expect(content).not.toMatch(/className="[^"]*bg-surface dark:bg-\[#18181b\]\/95 p-3 sm:p-4 rounded-2xl border border-border-default/);
  });

  it('verifies FilterToolbar component adheres to flat, non-card presentation rules', () => {
    const filePath = path.resolve(__dirname, '../components/ui/FilterToolbar.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('flex');
    // Ensure FilterToolbar does not add card backgrounds or borders by default
    expect(content).not.toContain('bg-surface');
    expect(content).not.toContain('border-border-default');
    expect(content).not.toContain('shadow-xl');
  });
});
