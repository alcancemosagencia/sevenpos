import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SidebarItem } from '../components/shell/SidebarItem';
import { Store } from 'lucide-react';

describe('A7: Sidebar Shortcut Badge Responsive Visibility', () => {
  it('renders shortcut badge with hidden lg:inline-flex classes so it is hidden below 1024px', () => {
    const html = renderToString(
      <SidebarItem
        id="pos"
        title="Punto de venta"
        icon={Store}
        href="/pos"
        isActive={false}
        shortcut="F2"
        onClick={() => {}}
      />
    );

    expect(html).toContain('F2');
    expect(html).toContain('hidden lg:inline-flex');
  });
});
