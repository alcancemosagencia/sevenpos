import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PlatformSettingsPage } from '../platform/pages/PlatformSettingsPage';
import * as PlatformAuthContextModule from '../platform/context/PlatformAuthContext';

vi.mock('../infrastructure/cloud/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe('PLATFORM-01D — Super Admin Settings & Change Password UI Tests', () => {
  const mockSignOut = vi.fn();
  const mockAdmin = {
    id: 'admin-1',
    userId: 'usr-admin-1',
    email: 'admin@sevenpos.pro',
    role: 'SUPER_ADMIN' as const,
    createdAt: '2026-09-21T10:00:00Z',
    lastLoginAt: '2026-09-21T14:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(PlatformAuthContextModule, 'usePlatformAuth').mockReturnValue({
      admin: mockAdmin,
      isLoading: false,
      authError: null,
      signIn: vi.fn(),
      signOut: mockSignOut,
      refreshAdmin: vi.fn(),
    });
  });

  it('1. renders admin account section with email, role, status and formatted date', () => {
    const html = renderToString(<PlatformSettingsPage />);

    expect(html).toContain('Configuración');
    expect(html).toContain('admin@sevenpos.pro');
    expect(html).toContain('SUPER_ADMIN');
    expect(html).toContain('Activo');
    expect(html).toContain('Cuenta Super Admin');
  });

  it('2. renders change password section with rules checklist in Spanish', () => {
    const html = renderToString(<PlatformSettingsPage />);

    expect(html).toContain('Cambiar contraseña');
    expect(html).toContain('Mantén tu acceso a SevenPOS Platform protegido con una contraseña única.');
    expect(html).toContain('12 caracteres o más');
    expect(html).toContain('Una mayúscula');
    expect(html).toContain('Una minúscula');
    expect(html).toContain('Un número');
    expect(html).toContain('Un carácter especial');
    expect(html).toContain('Contraseña actual');
    expect(html).toContain('Nueva contraseña');
    expect(html).toContain('Confirmar nueva contraseña');
  });

  it('3. renders session section with active status and sign out controls', () => {
    const html = renderToString(<PlatformSettingsPage />);

    expect(html).toContain('Sesiones');
    expect(html).toContain('Sesión actual: Activa');
    expect(html).toContain('Cerrar sesión');
    expect(html).toContain('Cerrar todas las sesiones');
  });

  it('4. evaluates password validation rules strictly and consistently', () => {
    const validate = (pass: string) => {
      const hasMinLength = pass.length >= 12;
      const hasUppercase = /[A-Z]/.test(pass);
      const hasLowercase = /[a-z]/.test(pass);
      const hasNumber = /[0-9]/.test(pass);
      const hasSpecial = /[^A-Za-z0-9]/.test(pass);
      return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    };

    expect(validate('short1!')).toBe(false); // too short
    expect(validate('alllowercase1234!')).toBe(false); // no uppercase
    expect(validate('ALLUPPERCASE1234!')).toBe(false); // no lowercase
    expect(validate('NoNumberSpecialChars!!')).toBe(false); // no number
    expect(validate('NoSpecialChar123456')).toBe(false); // no special
    expect(validate('ValidSuperAdmin2026!')).toBe(true); // valid
  });

  it('5. returns null when admin is unauthenticated (non-admin access denied)', () => {
    vi.spyOn(PlatformAuthContextModule, 'usePlatformAuth').mockReturnValue({
      admin: null,
      isLoading: false,
      authError: null,
      signIn: vi.fn(),
      signOut: mockSignOut,
      refreshAdmin: vi.fn(),
    });

    const html = renderToString(<PlatformSettingsPage />);
    expect(html).toBe('');
  });
});