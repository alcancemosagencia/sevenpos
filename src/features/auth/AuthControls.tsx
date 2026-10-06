import type { ComponentProps, ReactNode } from 'react';
import { Button, FieldError, Input, Label, TextField } from '@heroui/react';
import { Check, Minus } from 'lucide-react';

type FieldProps = { label: string; value: string; onChange: (value: string) => void; error?: string; } & Pick<ComponentProps<typeof Input>, 'type' | 'autoComplete' | 'id' | 'minLength' | 'maxLength' | 'placeholder' | 'disabled' | 'readOnly'> & { required?: boolean };
export function AuthField({ label, value, onChange, error, required, ...props }: FieldProps) {
  return <TextField className="auth-field" value={value} onChange={onChange} isRequired={required} isInvalid={Boolean(error)} validationBehavior="native">
    <Label className="auth-label">{label}</Label><Input {...props} className="auth-input" />
    {error && <FieldError id={props.id ? `${props.id}-error` : undefined} className="auth-error"><span role="alert">{error}</span></FieldError>}
  </TextField>;
}
export function AuthButton({ children, busy = false, secondary = false, ...props }: Omit<ComponentProps<typeof Button>, 'children'> & { children: ReactNode; busy?: boolean; secondary?: boolean }) {
  return <Button {...props} isDisabled={props.isDisabled || busy} isPending={busy} className={`auth-cta ${secondary ? 'auth-cta--secondary' : ''} ${props.className ?? ''}`}>
    {busy && <span className="auth-spinner" aria-hidden="true" />}{children}
  </Button>;
}
export function passwordRules(password: string) {
  return [{ label: '8+ caracteres', valid: password.length >= 8 }, { label: '1 mayúscula', valid: /[A-Z]/.test(password) }, { label: '1 número', valid: /[0-9]/.test(password) }, { label: '1 carácter especial', valid: /[^A-Za-z0-9]/.test(password) }];
}
export function PasswordRules({ password }: { password: string }) {
  return <ul className="auth-password-rules" aria-label="Requisitos de contraseña">{passwordRules(password).map(rule => <li key={rule.label} data-valid={rule.valid}>
    {rule.valid ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}<span>{rule.label}</span><span className="sr-only">{rule.valid ? ': cumplido' : ': pendiente'}</span>
  </li>)}</ul>;
}
export function AuthFeedback({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <p className={`auth-feedback ${success ? 'auth-feedback--success' : ''}`} role={success ? 'status' : 'alert'}>{children}</p>;
}
