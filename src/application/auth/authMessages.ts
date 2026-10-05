export const EXISTING_ACCOUNT_MESSAGE = 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
export const AMBIGUOUS_SIGNUP_MESSAGE = 'Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.';
export function authMessage(error: unknown, fallback: string): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  if ([EXISTING_ACCOUNT_MESSAGE, 'Este código ya venció. Solicita uno nuevo.', 'Código incorrecto. Revisa los números e inténtalo nuevamente.', 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.'].includes(message)) return message;
  if (['user_already_exists', 'email_exists'].includes(code) || message === 'AUTH_ACCOUNT_EXISTS') return EXISTING_ACCOUNT_MESSAGE;
  if (message === 'AUTH_OTP_EXPIRED' || code === 'otp_expired') return 'Este código ya venció. Solicita uno nuevo.';
  if (message === 'AUTH_OTP_INVALID') return 'Código incorrecto. Revisa los números e inténtalo nuevamente.';
  if (['over_request_rate_limit', 'over_email_send_rate_limit'].includes(code) || message === 'AUTH_RATE_LIMIT') return 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.';
  if (code === 'weak_password') return 'La contraseña no cumple los requisitos de seguridad.';
  if (message === 'BUSINESS_ACCESS_DENIED') return 'No pudimos confirmar el acceso a tu negocio. Contacta soporte.';
  return fallback;
}
