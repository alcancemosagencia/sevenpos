import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GeneralSection } from '../features/settings/components/GeneralSection';
import { GeneralSettingsForm } from '../features/settings/types';

describe('AG-13B: Owner Email Read-Only UI Contract', () => {
  const dummyInitialData: GeneralSettingsForm = {
    name: 'Mi Tienda',
    fiscalId: 'J-12345678-9',
    phone: '4120000000',
    phonePrefix: '+58',
    address: 'Av. Principal',
    countryCode: 'VE',
  };

  it('renders Correo del propietario as read-only and displays the verified email', () => {
    const html = renderToString(
      <GeneralSection
        initialData={dummyInitialData}
        ownerEmail="dueno@sevenpos.com"
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Correo del propietario');
    expect(html).toContain('dueno@sevenpos.com');
    expect(html).toContain('Solo lectura');
  });

  it('renders Cuenta vinculada when isCloudLinked is true but email is not available', () => {
    const html = renderToString(
      <GeneralSection
        initialData={dummyInitialData}
        ownerEmail={null}
        isCloudLinked={true}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Correo del propietario');
    expect(html).toContain('Cuenta vinculada');
    expect(html).not.toContain('Cuenta no vinculada');
  });

  it('renders fallback when owner email is unlinked and isCloudLinked is false', () => {
    const html = renderToString(
      <GeneralSection
        initialData={dummyInitialData}
        ownerEmail={null}
        isCloudLinked={false}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Correo del propietario');
    expect(html).toContain('Cuenta no vinculada');
  });
});
