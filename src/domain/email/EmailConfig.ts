/**
 * SevenPOS — Transactional Email & Sender Identity Configuration
 *
 * ARCHITECTURAL BOUNDARY:
 * - Supabase Auth (Custom SMTP): EXCLUSIVELY for authentication & transactional security emails.
 *   Sender: cuenta@sevenpos.pro (Name: SevenPOS) | Reply-To: soporte@sevenpos.pro
 *
 * - GoHighLevel / Marketing CRM: EXCLUSIVELY for commercial, sales, onboarding drips & support inboxes.
 *   Senders: ventas@sevenpos.pro, contacto@sevenpos.pro, soporte@sevenpos.pro
 *
 * NEVER route transactional auth/OTP emails through GoHighLevel.
 * NEVER route marketing campaigns through Supabase Auth SMTP.
 */

export const EMAIL_CONFIG = {
  DOMAIN: 'sevenpos.pro',
  AUTH_DOMAIN: 'auth.sevenpos.pro',
  CANONICAL_APP_URL: 'https://sevenpos.pro',
  
  // Transactional Auth Sender Identity (Supabase Auth SMTP)
  TRANSACTIONAL: {
    SENDER_EMAIL: 'cuenta@auth.sevenpos.pro',
    SENDER_NAME: 'SevenPOS',
    REPLY_TO: 'soporte@sevenpos.pro',
    DEFAULT_OTP_EXPIRY_MINUTES: 60,
    DEFAULT_OTP_LENGTH: 8,
    RESEND_COOLDOWN_SECONDS: 45,
  },

  // Commercial / Marketing (GoHighLevel - Isolated)
  COMMERCIAL: {
    SALES_EMAIL: 'ventas@sevenpos.pro',
    SUPPORT_EMAIL: 'soporte@sevenpos.pro',
    CONTACT_EMAIL: 'contacto@sevenpos.pro',
  },
} as const;

export type TransactionalEmailType =
  | 'VERIFY_ACCOUNT'
  | 'PASSWORD_RECOVERY'
  | 'EMAIL_CHANGE'
  | 'SECURITY_PASSWORD_CHANGED'
  | 'SECURITY_EMAIL_CHANGED'
  | 'USER_INVITATION';
