import { FormEvent, useEffect, useState } from 'react';
import { getSupabaseClient } from '../../infrastructure/cloud/supabaseClient';
import { getCustomerAppUrl } from '../../app/customerAppUrls';
import { AuthLayout } from './AuthLayout';
import { AuthButton, AuthField, AuthFeedback, PasswordRules } from './AuthControls';

/** Consumes a recovery session on the same origin where the old email link lands. */
export function PasswordRecoveryPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    async function validate() {
      try {
        const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
        if (!active) return;
        if (sessionError || !data.session) {
          setError('El enlace no es válido o venció. Solicita uno nuevo desde el inicio de sesión.');
        } else {
          setReady(true);
        }
      } catch {
        if (active) setError('No se pudo validar el enlace. Inténtalo nuevamente.');
      }
    }
    void validate();
    return () => { active = false; };
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const client = getSupabaseClient();
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      await client.auth.signOut();
      setComplete(true);
      setPassword('');
      setConfirm('');
      window.location.replace(getCustomerAppUrl('/login'));
    } catch {
      setError('No se pudo actualizar la contraseña. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  return <AuthLayout illustration="security">
    <h1>Restablece tu contraseña</h1>
    <p className="auth-description">Elige una nueva contraseña para volver a tu negocio con seguridad.</p>
    {complete ? <AuthFeedback success>Contraseña actualizada. Ya puedes iniciar sesión en la aplicación.</AuthFeedback> : ready ? <form className="auth-form" onSubmit={savePassword} aria-busy={saving}>
      <AuthField label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={setPassword} required minLength={8} />
      <AuthField label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} required minLength={8} />
      <PasswordRules password={password} />
      <AuthButton type="submit" busy={saving}>{saving ? 'Guardando…' : 'Guardar contraseña'}</AuthButton>
    </form> : !error ? <p role="status" className="auth-description">Validando enlace…</p> : null}
    {error && <AuthFeedback>{error}</AuthFeedback>}
    <p className="auth-footer"><a className="auth-link" href={getCustomerAppUrl('/login')}>Ir al inicio de sesión</a></p>
  </AuthLayout>;
}
