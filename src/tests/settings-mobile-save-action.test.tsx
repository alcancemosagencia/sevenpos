import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GeneralSection } from '../features/settings/components/GeneralSection';
import { PosSection } from '../features/settings/components/PosSection';
import { InventorySection } from '../features/settings/components/InventorySection';

describe('AG-13 — Settings Mobile Save Action Contract', () => {
  it('GeneralSection save CTA has responsive full-width mobile class', () => {
    const html = renderToString(
      <GeneralSection
        initialData={{
          name: 'Don Pepe',
          fiscalId: '76.123.456-7',
          phone: '912345678',
          phonePrefix: '+56',
          address: 'Av. Providencia 123',
          countryCode: 'CL',
        }}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Guardar cambios');
    expect(html).toContain('w-full');
    expect(html).toContain('sm:w-auto');
  });

  it('PosSection save CTA has responsive full-width mobile class', () => {
    const html = renderToString(
      <PosSection
        initialData={{
          confirmBeforeFinalizingSale: true,
          showStockInGrid: true,
          autoPrintReceipt: false,
        }}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Guardar cambios');
    expect(html).toContain('w-full');
    expect(html).toContain('sm:w-auto');
  });

  it('InventorySection save CTA has responsive full-width mobile class', () => {
    const html = renderToString(
      <InventorySection
        initialData={{
          allowNegativeStock: false,
        }}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Guardar cambios');
    expect(html).toContain('w-full');
    expect(html).toContain('sm:w-auto');
  });
});
