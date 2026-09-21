import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { EMAIL_CONFIG } from '../domain/email/EmailConfig';
import { EMAIL_TEMPLATES } from '../infrastructure/email/EmailTemplateRegistry';
import { SupabaseAuthService } from '../infrastructure/cloud/SupabaseAuthService';
import { CloudAuthService, CloudUser, CloudBusinessMembership, BootstrapOwnerResult, CloudDeviceRecord } from '../domain/auth/CloudAuthService';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { InMemorySessionRepository } from '../infrastructure/repositories/InMemorySessionRepository';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { CloudBusinessLinkStorage } from '../infrastructure/auth/CloudBusinessLinkStorage';

// Instrumented mock for AuthContext testing
class MockEmailCloudAuthService implements CloudAuthService {
  public mockUser: CloudUser | null = null;
  public mockMemberships: CloudBusinessMembership[] = [];
  public enrolledDevices: CloudDeviceRecord[] = [];
  public resentEmails: string[] = [];
  public verifiedOtps: Array<{ email: string; token: string; type?: string }> = [];

  async getUser(): Promise<CloudUser | null> {
    return this.mockUser;
  }

  async signInWithPassword(email: string): Promise<CloudUser> {
    this.mockUser = { id: 'usr-email-1', email, emailConfirmed: true };
    return this.mockUser;
  }

  async signUp(params: { email: string; password: string; firstName: string; lastName?: string }): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }> {
    this.mockUser = { id: 'usr-signup-1', email: params.email, emailConfirmed: false };
    return { user: this.mockUser, requiresEmailVerification: true };
  }

  async signOut(): Promise<void> {
    this.mockUser = null;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    this.resentEmails.push(email);
    if (email.includes('ratelimit')) {
      throw new Error('Por favor espera antes de solicitar un nuevo código de verificación.');
    }
  }

  async sendPasswordReset(): Promise<void> {}

  async checkEmailVerified(): Promise<boolean> {
    return !!this.mockUser?.emailConfirmed;
  }

  async getMemberships(): Promise<CloudBusinessMembership[]> {
    return this.mockMemberships;
  }

  async bootstrapOwnerBusiness(params: {
    firstName: string;
    lastName?: string;
    businessName: string;
    countryCode?: string;
  }): Promise<BootstrapOwnerResult> {
    const res: BootstrapOwnerResult = {
      userId: this.mockUser?.id || 'usr-signup-1',
      email: this.mockUser?.email || 'owner@auth.sevenpos.pro',
      firstName: params.firstName,
      lastName: params.lastName || '',
      businessId: 'biz-email-1',
      businessName: params.businessName,
      countryCode: params.countryCode || 'CL',
      role: 'OWNER',
      bootstrapCreated: true,
    };
    this.mockMemberships.push({
      businessId: res.businessId,
      businessName: res.businessName,
      countryCode: res.countryCode,
      role: 'OWNER',
      status: 'ACTIVE',
    });
    return res;
  }

  async enrollDevice(params: {
    businessId: string;
    deviceName: string;
    platform: string;
    deviceType: import('../domain/auth/DeviceEnrollment').DeviceType;
  }): Promise<CloudDeviceRecord> {
    const dev: CloudDeviceRecord = {
      id: 'dev-email-1',
      businessId: params.businessId,
      userId: this.mockUser?.id || 'usr-signup-1',
      deviceName: params.deviceName,
      platform: params.platform,
      deviceType: params.deviceType,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      revokedAt: null,
    };
    this.enrolledDevices.push(dev);
    return dev;
  }

  async verifyEmailOtp(email: string, token: string, type: 'signup' | 'recovery' | 'email_change' | 'email' = 'signup'): Promise<CloudUser> {
    this.verifiedOtps.push({ email, token, type });
    if (token === '00000000') {
      throw new Error('Este código ya venció. Solicita uno nuevo.');
    }
    if (token !== '12345678') {
      throw new Error('Código incorrecto. Revisa los números e inténtalo nuevamente.');
    }
    this.mockUser = { id: 'usr-signup-1', email, emailConfirmed: true };
    return this.mockUser;
  }

  async getDevice(deviceId: string): Promise<CloudDeviceRecord | null> {
    return this.enrolledDevices.find((d) => d.id === deviceId) || null;
  }
}

describe('INFRA-EMAIL-01 — SevenPOS Transactional Email System Verification', () => {
  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    CloudBusinessLinkStorage.clearLink();
  });

  // 1. DOMAIN IDENTITY & ARCHITECTURAL BOUNDARIES
  describe('1. Domain Identity & Sender Isolation Contract', () => {
    it('defines canonical transactional sender on dedicated auth subdomain as cuenta@auth.sevenpos.pro', () => {
      expect(EMAIL_CONFIG.DOMAIN).toBe('sevenpos.pro');
      expect(EMAIL_CONFIG.AUTH_DOMAIN).toBe('auth.sevenpos.pro');
      expect(EMAIL_CONFIG.CANONICAL_APP_URL).toBe('https://sevenpos.pro');
      expect(EMAIL_CONFIG.TRANSACTIONAL.SENDER_EMAIL).toBe('cuenta@auth.sevenpos.pro');
      expect(EMAIL_CONFIG.TRANSACTIONAL.SENDER_NAME).toBe('SevenPOS');
      expect(EMAIL_CONFIG.TRANSACTIONAL.REPLY_TO).toBe('soporte@sevenpos.pro');
      expect(EMAIL_CONFIG.TRANSACTIONAL.DEFAULT_OTP_LENGTH).toBe(8);
      expect(EMAIL_CONFIG.TRANSACTIONAL.RESEND_COOLDOWN_SECONDS).toBe(45);
    });

    it('isolates commercial GHL senders from transactional authentication sender', () => {
      expect(EMAIL_CONFIG.COMMERCIAL.SALES_EMAIL).toBe('ventas@sevenpos.pro');
      expect(EMAIL_CONFIG.COMMERCIAL.SUPPORT_EMAIL).toBe('soporte@sevenpos.pro');
      expect(EMAIL_CONFIG.COMMERCIAL.CONTACT_EMAIL).toBe('contacto@sevenpos.pro');
      expect(EMAIL_CONFIG.COMMERCIAL.SALES_EMAIL).not.toBe(EMAIL_CONFIG.TRANSACTIONAL.SENDER_EMAIL);
    });
  });

  // 2. TEMPLATE AUDIT & BRAND BLUE STYLING
  describe('2. Branded HTML Email Templates Audit', () => {
    const templatesDir = path.resolve(__dirname, '../../supabase/templates');

    it('all 6 required template files exist in supabase/templates/ and mirror in src/infrastructure/email/templates/', () => {
      const canonicalFiles = fs.readdirSync(templatesDir);
      const mirrorDir = path.resolve(__dirname, '../../src/infrastructure/email/templates');
      const mirrorFiles = fs.readdirSync(mirrorDir);

      const requiredFiles = [
        'verify_account.html',
        'password_recovery.html',
        'email_change.html',
        'security_password_changed.html',
        'security_email_changed.html',
        'user_invitation.html',
      ];

      requiredFiles.forEach((file) => {
        expect(canonicalFiles).toContain(file);
        expect(mirrorFiles).toContain(file);

        const canonicalContent = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
        const mirrorContent = fs.readFileSync(path.join(mirrorDir, file), 'utf-8');

        // Perfect SHA/content parity
        expect(canonicalContent).toBe(mirrorContent);

        // Size budget: < 25,000 chars (well within 50,000 Supabase platform limit)
        expect(canonicalContent.length).toBeLessThan(25000);
        expect(canonicalContent.length).toBeGreaterThan(1000);

        // No Base64 images
        expect(canonicalContent).not.toContain('data:image');
        expect(canonicalContent).not.toContain('base64');

        // Public HTTPS logo URL
        expect(canonicalContent).toContain('https://sevenpos.pro/brand/email-logo.png');

        // No Unicode replacement character U+FFFD
        expect(canonicalContent).not.toContain('\uFFFD');

        // No common mojibake characters
        expect(canonicalContent).not.toContain('\u00C3');
        expect(canonicalContent).not.toContain('\u00C2');

        // UTF-8 charset declaration
        expect(canonicalContent).toContain('<meta charset="utf-8">');
      });
    });

    it('verify_account.html contains valid Supabase variables, public logo, and brand blue #2F6BFF styling', () => {
      const content = fs.readFileSync(path.join(templatesDir, 'verify_account.html'), 'utf-8');
      expect(content).toContain('{{ .Token }}');
      expect(content).toContain('{{ .ConfirmationURL }}');
      expect(content).toContain('#EAF2FF');
      expect(content).toContain('#2F6BFF');
      expect(content).not.toContain('#10b981');
      expect(content).toContain('1 hora');
      expect(content).toContain('https://sevenpos.pro/brand/email-logo.png');
    });

    it('password_recovery.html contains Token, ConfirmationURL and brand blue styling', () => {
      const content = fs.readFileSync(path.join(templatesDir, 'password_recovery.html'), 'utf-8');
      expect(content).toContain('{{ .Token }}');
      expect(content).toContain('{{ .ConfirmationURL }}');
      expect(content).toContain('Restablece tu contrase&ntilde;a');
      expect(content).toContain('#2F6BFF');
      expect(content).not.toContain('#10b981');
      expect(content).toContain('Tambi&eacute;n puedes usar este c&oacute;digo en SevenPOS:');
    });

    it('email_change.html contains Token and ConfirmationURL for email update verification', () => {
      const content = fs.readFileSync(path.join(templatesDir, 'email_change.html'), 'utf-8');
      expect(content).toContain('{{ .Token }}');
      expect(content).toContain('{{ .ConfirmationURL }}');
      expect(content).toContain('Confirma tu nuevo correo');
      expect(content).toContain('#2F6BFF');
      expect(content).toContain('C&Oacute;DIGO DE VERIFICACI&Oacute;N');
    });

    it('security notification templates contain support contact links and minimalist styling', () => {
      const pwdChanged = fs.readFileSync(path.join(templatesDir, 'security_password_changed.html'), 'utf-8');
      expect(pwdChanged).toContain('Contrase&ntilde;a actualizada');
      expect(pwdChanged).toContain('Contactar soporte');
      expect(pwdChanged).toContain('#EAF2FF');
      expect(pwdChanged).toContain('{{ .Email }}');

      const emailChanged = fs.readFileSync(path.join(templatesDir, 'security_email_changed.html'), 'utf-8');
      expect(emailChanged).toContain('Correo modificado');
      expect(emailChanged).toContain('Contactar soporte');
      expect(emailChanged).toContain('#EAF2FF');
      expect(emailChanged).toContain('{{ .Email }}');
    });

    it('user_invitation.html is explicitly marked TEMPLATE ONLY and notes Cloud vs Local PIN distinction', () => {
      const content = fs.readFileSync(path.join(templatesDir, 'user_invitation.html'), 'utf-8');
      expect(content).toContain('TEMPLATE ONLY');
      expect(content).toContain('Cloud Identity does not replace Local PIN Users');
      expect(content).toContain('PIN local independiente');
      expect(content).toContain('Aceptar invitaci&oacute;n');
      expect(content).toContain('#2F6BFF');
    });

    it('template registry exposes metadata for all templates', () => {
      expect(EMAIL_TEMPLATES.VERIFY_ACCOUNT.filename).toBe('verify_account.html');
      expect(EMAIL_TEMPLATES.PASSWORD_RECOVERY.filename).toBe('password_recovery.html');
      expect(EMAIL_TEMPLATES.EMAIL_CHANGE.filename).toBe('email_change.html');
      expect(EMAIL_TEMPLATES.SECURITY_PASSWORD_CHANGED.filename).toBe('security_password_changed.html');
      expect(EMAIL_TEMPLATES.SECURITY_EMAIL_CHANGED.filename).toBe('security_email_changed.html');
      expect(EMAIL_TEMPLATES.USER_INVITATION.filename).toBe('user_invitation.html');
    });
  });

  // 3. INFRASTRUCTURE ERROR MAPPING
  describe('3. SupabaseAuthService Natural Spanish Error Mapping', () => {
    it('maps expired OTP errors to friendly message', async () => {
      const mockSupabaseClient = {
        auth: {
          verifyOtp: async () => ({
            data: { user: null },
            error: { message: 'Token has expired or is invalid' },
          }),
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const service = new SupabaseAuthService(mockSupabaseClient);
      await expect(service.verifyEmailOtp('test@auth.sevenpos.pro', '12345678')).rejects.toThrow(
        'Este código ya venció. Solicita uno nuevo.'
      );
    });

    it('maps invalid OTP token to friendly message', async () => {
      const mockSupabaseClient = {
        auth: {
          verifyOtp: async () => ({
            data: { user: null },
            error: { message: 'Invalid OTP format' },
          }),
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const service = new SupabaseAuthService(mockSupabaseClient);
      await expect(service.verifyEmailOtp('test@auth.sevenpos.pro', '99999999')).rejects.toThrow(
        'Código incorrecto. Revisa los números e inténtalo nuevamente.'
      );
    });

    it('maps rate limits to friendly waiting message on resend', async () => {
      const mockSupabaseClient = {
        auth: {
          resend: async () => ({
            error: { message: 'For security purposes, you can only request this once every 60 seconds' },
          }),
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const service = new SupabaseAuthService(mockSupabaseClient);
      await expect(service.resendVerificationEmail('test@auth.sevenpos.pro')).rejects.toThrow(
        'Por favor espera antes de solicitar un nuevo código de verificación.'
      );
    });

    it('returns confirmed user on successful 8-digit OTP verification', async () => {
      const mockSupabaseClient = {
        auth: {
          verifyOtp: async () => ({
            data: {
              user: {
                id: 'usr-valid-1',
                email: 'test@auth.sevenpos.pro',
                email_confirmed_at: '2026-09-20T12:00:00Z',
              },
            },
            error: null,
          }),
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const service = new SupabaseAuthService(mockSupabaseClient);
      const user = await service.verifyEmailOtp('test@auth.sevenpos.pro', '12345678');
      expect(user.id).toBe('usr-valid-1');
      expect(user.email).toBe('test@auth.sevenpos.pro');
      expect(user.emailConfirmed).toBe(true);
    });
  });

  // 4. AUTH FLOW & OTP VERIFICATION
  describe('4. Mock CloudAuthService End-to-End Verification Flow', () => {
    let cloudAuth: MockEmailCloudAuthService;

    beforeEach(() => {
      cloudAuth = new MockEmailCloudAuthService();
    });

    it('signs up and requires verification, then successfully confirms with 8-digit OTP 12345678', async () => {
      const signup = await cloudAuth.signUp({
        email: 'nuevo@auth.sevenpos.pro',
        password: 'Password123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      });

      expect(signup.requiresEmailVerification).toBe(true);
      expect(signup.user?.emailConfirmed).toBe(false);

      // Verify OTP
      const confirmedUser = await cloudAuth.verifyEmailOtp('nuevo@auth.sevenpos.pro', '12345678');
      expect(confirmedUser.emailConfirmed).toBe(true);
      expect(cloudAuth.verifiedOtps).toHaveLength(1);
      expect(cloudAuth.verifiedOtps[0]).toEqual({
        email: 'nuevo@auth.sevenpos.pro',
        token: '12345678',
        type: 'signup',
      });

      // Bootstrap business
      const bootstrap = await cloudAuth.bootstrapOwnerBusiness({
        firstName: 'Juan',
        businessName: 'Mini Market Juan',
      });
      expect(bootstrap.businessName).toBe('Mini Market Juan');
      expect(bootstrap.role).toBe('OWNER');
    });

    it('rejects invalid OTP token and expired OTP token with specific error messages', async () => {
      await expect(cloudAuth.verifyEmailOtp('test@auth.sevenpos.pro', '99999999')).rejects.toThrow(
        'Código incorrecto. Revisa los números e inténtalo nuevamente.'
      );

      await expect(cloudAuth.verifyEmailOtp('test@auth.sevenpos.pro', '00000000')).rejects.toThrow(
        'Este código ya venció. Solicita uno nuevo.'
      );
    });

    it('supports resending verification email with cooldown protection', async () => {
      await cloudAuth.resendVerificationEmail('user@auth.sevenpos.pro');
      expect(cloudAuth.resentEmails).toContain('user@auth.sevenpos.pro');

      await expect(cloudAuth.resendVerificationEmail('ratelimit@auth.sevenpos.pro')).rejects.toThrow(
        'Por favor espera antes de solicitar un nuevo código de verificación.'
      );
    });
  });

  // 5. LOCAL OFFLINE PIN INDEPENDENCE (INVARIANCE AUDIT)
  describe('5. Local Device PIN Invariance', () => {
    it('PIN verification does not require cloud network connection or cloud user session', async () => {
      const userRepo = new InMemoryUserRepository();
      const pinVault = new WebCryptoPinVaultFallback();
      const sessionRepo = new InMemorySessionRepository();
      const businessRepo = new InMemoryBusinessRepository();

      await businessRepo.saveBusinessWithSettings(
        {
          id: 'biz-offline-1',
          name: 'Almacén Don Pepe',
          countryCode: 'CL',
          phonePrefix: '+56',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          businessId: 'biz-offline-1',
          primaryCurrency: 'CLP',
          secondaryCurrencyEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      const owner = {
        id: 'usr-offline-owner',
        businessId: 'biz-offline-1',
        role: 'OWNER' as const,
        firstName: 'Pepe',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await userRepo.saveUser(owner);
      await pinVault.savePinCredential('usr-offline-owner', '1234');

      const { VerifyPin } = await import('../application/auth/VerifyPin');
      const verifyPin = new VerifyPin(userRepo, pinVault);

      // Verify PIN completely locally
      const pinResult = await verifyPin.execute('1234');
      expect(pinResult.isValid).toBe(true);
      expect(pinResult.userId).toBe('usr-offline-owner');

      // Local session saves without cloud calls
      await sessionRepo.saveSession({
        status: 'unlocked',
        unlockedUserId: 'usr-offline-owner',
        unlockedAt: new Date().toISOString(),
      });

      const session = await sessionRepo.getSession();
      expect(session?.status).toBe('unlocked');
    });
  });
});
