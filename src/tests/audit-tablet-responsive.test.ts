import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('AG-12D: Audit Tablet Responsive Breakpoint Verification', () => {
  it('should use lg breakpoint (>= 1024px) for desktop table and (< 1024px) for cards to prevent 768px tablet cutoff', () => {
    const auditPagePath = path.resolve('c:/Users/Omar/Documents/SevenPOS/src/pages/AuditPage.tsx');
    const content = fs.readFileSync(auditPagePath, 'utf8');

    // Desktop table must be hidden on screens below lg (< 1024px)
    expect(content).toContain('hidden lg:block');
    // Mobile/Tablet cards must be visible on screens below lg (< 1024px)
    expect(content).toContain('block lg:hidden');

    // Ensure md breakpoint is NOT used for hiding/showing table/cards
    expect(content).not.toContain('hidden md:block');
    expect(content).not.toContain('block md:hidden');
  });
});
