import { useEffect, useState } from 'react';
import { getCustomerAppUrl } from '../../app/customerAppUrls';
import { getSupabaseClient } from '../../infrastructure/cloud/supabaseClient';

/** The Supabase client consumes a same-origin email/PKCE callback before leaving root. */
export function LegacyAuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function consume() {
      try {
        const hadCode = new URL(window.location.href).searchParams.has('code');
        // getSession awaits supabase-js initialization, including detectSessionInUrl.
        // Do not move the one-time code or session across origins.
        const { data, error: authError } = await getSupabaseClient().auth.getSession();
        if (!active) return;
        // A pre-existing root session is not proof that this new code was consumed.
        const codeStillPresent = hadCode && new URL(window.location.href).searchParams.has('code');
        if (authError || !data.session || codeStillPresent) {
          setError('No se pudo completar el enlace en este navegador. Inicia sesión o solicita uno nuevo en la aplicación.');
          return;
        }
        window.location.replace(getCustomerAppUrl('/login'));
      } catch {
        if (active) setError('No se pudo verificar el enlace. Inicia sesión desde la aplicación.');
      }
    }
    void consume();
    return () => { active = false; };
  }, []);

  return <main className="min-h-screen flex items-center justify-center p-6 text-center">
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">Verificando enlace</h1>
      {error ? <p role="alert">{error}</p> : <p>Completando la verificación en este navegador…</p>}
      {error && <a className="underline" href={getCustomerAppUrl('/login')}>Iniciar sesión en SevenPOS</a>}
    </div>
  </main>;
}
