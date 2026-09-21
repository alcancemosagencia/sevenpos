/**
 * SevenPOS — Transactional Email Template Registry
 */

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  filename: string;
  subject: string;
  requiredVariables: string[];
  purpose: string;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplateDefinition> = {
  VERIFY_ACCOUNT: {
    id: 'verify_account',
    name: 'Confirm Signup / OTP Verification',
    filename: 'verify_account.html',
    subject: 'Verifica tu cuenta de SevenPOS',
    requiredVariables: ['{{ .Token }}', '{{ .ConfirmationURL }}'],
    purpose: 'Verificación de dirección de correo electrónico para nuevos registros mediante código OTP o enlace directo.',
  },
  PASSWORD_RECOVERY: {
    id: 'password_recovery',
    name: 'Reset Password',
    filename: 'password_recovery.html',
    subject: 'Restablece tu contraseña de SevenPOS',
    requiredVariables: ['{{ .Token }}', '{{ .ConfirmationURL }}'],
    purpose: 'Restablecimiento de contraseña olvidada mediante código OTP o enlace seguro.',
  },
  EMAIL_CHANGE: {
    id: 'email_change',
    name: 'Confirm Email Change',
    filename: 'email_change.html',
    subject: 'Confirma tu cambio de correo en SevenPOS',
    requiredVariables: ['{{ .Token }}', '{{ .ConfirmationURL }}'],
    purpose: 'Confirmación de nueva dirección de correo electrónico cuando el usuario solicita actualizarla.',
  },
  SECURITY_PASSWORD_CHANGED: {
    id: 'security_password_changed',
    name: 'Security Alert: Password Changed',
    filename: 'security_password_changed.html',
    subject: 'Aviso de seguridad: Contraseña actualizada',
    requiredVariables: [],
    purpose: 'Notificación de seguridad confirmando cambio exitoso de contraseña para prevenir secuestro de cuenta.',
  },
  SECURITY_EMAIL_CHANGED: {
    id: 'security_email_changed',
    name: 'Security Alert: Email Changed',
    filename: 'security_email_changed.html',
    subject: 'Aviso de seguridad: Correo electrónico modificado',
    requiredVariables: [],
    purpose: 'Notificación enviada a la dirección previa para alertar de cambio de correo.',
  },
  USER_INVITATION: {
    id: 'user_invitation',
    name: 'User Invitation (Template Only)',
    filename: 'user_invitation.html',
    subject: 'Has sido invitado a SevenPOS',
    requiredVariables: ['{{ .ConfirmationURL }}'],
    purpose: 'Plantilla de referencia para invitar operadores o administradores al panel en la nube.',
  },
};
