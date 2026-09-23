import { FormEvent, useEffect, useState } from 'react';
import { getSupabaseClient } from '../../infrastructure/cloud/supabaseClient';

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-text-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface p-8 shadow-xl">
        <p className="text-sm font-semibold text-brand-primary">SevenPOS</p>
        <h1 className="mt-4 text-2xl font-bold">Restablecer contraseña</h1>
        {complete ? (
          <p className="mt-5 text-sm">Contraseña actualizada. Ya puedes iniciar sesión en la aplicación.</p>
        ) : ready ? (
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            <label className="block text-sm">Nueva contraseña
              <input className="mt-1 w-full rounded-lg border border-border-default bg-background p-3" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
            </label>
            <label className="block text-sm">Confirmar contraseña
              <input className="mt-1 w-full rounded-lg border border-border-default bg-background p-3" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} />
            </label>
            <button className="w-full rounded-lg bg-brand-primary p-3 font-semibold text-white disabled:opacity-50" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        ) : !error ? (
          <p className="mt-5 text-sm">Validando enlace…</p>
        ) : null}
        {error && <p role="alert" className="mt-4 text-sm text-status-danger">{error}</p>}
        <a className="mt-6 inline-block text-sm text-brand-primary underline" href="https://app.sevenpos.pro/login">Ir al inicio de sesión</a>
      </div>
    </main>
  );
}
