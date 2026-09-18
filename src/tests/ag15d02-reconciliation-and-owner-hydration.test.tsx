import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GeneralSection } from '../features/settings/components/GeneralSection';
import { GeneralSettingsForm } from '../features/settings/types';

describe('AG-15D-02: Settings Owner Email Hydration & Cloud Link Integrity', () => {
  const dummyForm: GeneralSettingsForm = {
    name: 'Minimarket Don Pepe',
    fiscalId: '76.123.456-7',
    phone: '912345678',
    phonePrefix: '+56',
    address: 'Av. Providencia 1234',
    countryCode: 'CL',
  };

  it('displays owner email when cloud session is active as OWNER', () => {
    const html = renderToString(
      <GeneralSection
        initialData={dummyForm}
        ownerEmail="alcancemosagencia@gmail.com"
        isCloudLinked={true}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Correo del propietario');
    expect(html).toContain('alcancemosagencia@gmail.com');
    expect(html).toContain('Solo lectura');
    expect(html).not.toContain('Cuenta no vinculada');
  });

  it('displays owner email resolved from device enrollment when cloud session is offline/unhydrated', () => {
    const resolvedEmailFromEnrollment = 'alcancemosagencia@gmail.com';
    const html = renderToString(
      <GeneralSection
        initialData={dummyForm}
        ownerEmail={resolvedEmailFromEnrollment}
        isCloudLinked={true}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('alcancemosagencia@gmail.com');
    expect(html).not.toContain('Cuenta no vinculada');
  });

  it('displays Cuenta vinculada (not Cuenta no vinculada) when device is linked but owner email is not yet available', () => {
    const html = renderToString(
      <GeneralSection
        initialData={dummyForm}
        ownerEmail={null}
        isCloudLinked={true}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Cuenta vinculada');
    expect(html).not.toContain('Cuenta no vinculada');
  });

  it('displays Cuenta no vinculada only for a truly unlinked local business', () => {
    const html = renderToString(
      <GeneralSection
        initialData={dummyForm}
        ownerEmail={null}
        isCloudLinked={false}
        onSave={async () => ({ success: true })}
        onDirtyChange={() => {}}
      />
    );

    expect(html).toContain('Cuenta no vinculada');
    expect(html).not.toContain('Cuenta vinculada');
  });
});
