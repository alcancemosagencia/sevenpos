import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingsPage } from '../pages/SettingsPage';
import { AuthContext, AuthContextType } from '../context/AuthContext';

const mockAuthValue: Partial<AuthContextType> = {
  businessId: 'biz_123',
  activeBusinessName: 'Minimarket Don Pepe',
  activeOwnerName: 'Pedro Perez',
  activeCountryCode: 'CL',
  isHydrated: true,
  bootStatus: 'READY',
  authMachineState: 'DEVICE_UNLOCKED',
  onboardingStatus: 'completed',
  deviceEnrollment: {
    deviceId: 'dev_1234567890abcdef',
    cloudBusinessId: 'biz_123',
    userId: 'user_123',
    accountEmail: 'pepe@donpepe.cl',
    businessName: 'Minimarket Don Pepe',
    displayName: 'Caja Principal',
    platform: 'Web',
    deviceType: 'DESKTOP',
    enrolledAt: '2026-01-01T00:00:00Z',
  },
};

describe('AG-13 — Settings Mobile Subnav & Tabs Contract', () => {
  it('renders all 8 configuration tabs with accessible tab roles and min-height touch targets', () => {
    const html = renderToString(
      <AuthContext.Provider value={mockAuthValue as AuthContextType}>
        <SettingsPage />
      </AuthContext.Provider>
    );

    expect(html).toContain('role="tab"');
    expect(html).toContain('General');
    expect(html).toContain('Moneda y Región');
    expect(html).toContain('Punto de Venta');
    expect(html).toContain('Tickets e Impresión');
    expect(html).toContain('Inventario');
    expect(html).toContain('Seguridad y Acceso');
    expect(html).toContain('Dispositivo');
    expect(html).toContain('Apariencia');

    // Verify touch target classes (min-h-[44px] on mobile)
    expect(html).toContain('min-h-[44px]');
  });
});
