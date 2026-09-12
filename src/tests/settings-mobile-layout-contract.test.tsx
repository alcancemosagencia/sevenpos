import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingRow } from '../features/settings/components/SettingRow';

describe('AG-13 — SettingRow Mobile Layout Contract', () => {
  it('renders title, description and children with responsive vertical stack on mobile classes', () => {
    const html = renderToString(
      <SettingRow
        label="Confirmar antes de finalizar venta"
        description="Muestra un paso de confirmación y resumen antes de asentar el pago en el sistema."
      >
        <button type="button">Switch</button>
      </SettingRow>
    );

    expect(html).toContain('Confirmar antes de finalizar venta');
    expect(html).toContain('Muestra un paso de confirmación y resumen antes de asentar el pago en el sistema.');
    expect(html).toContain('Switch');

    // Verify responsive classes
    expect(html).toContain('flex-col');
    expect(html).toContain('md:flex-row');
    expect(html).toContain('w-full');
  });
});
