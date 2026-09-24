# LANDING-01F-RELEASE-2B — navegación entre hosts

Estado: revisión local, sin activar el corte. El flag `VITE_MARKETING_ROOT_ENABLED` sigue desactivado en producción.

| Flujo | Host inicial | Navegación anterior | Destino requerido con corte |
| --- | --- | --- | --- |
| Retorno de Mercado Pago legacy | `sevenpos.pro/subscription/return` | `AppRoot`/`AuthContext` normalizaban la ruta desconocida a `/dashboard` con `history.replaceState` | Handler aislado; reconciliación/consulta cloud autoritativa; `location.replace` a `app.sevenpos.pro/subscription` |
| Retorno de Mercado Pago nuevo | `app.sevenpos.pro/subscription/return` | AppShell podía normalizar a `/dashboard` | Handler aislado; salida a `/subscription` del app host |
| Callback Auth legacy | `sevenpos.pro/auth/callback` | `AppRoot` podía montar AppShell y reemplazar la ruta | Handler aislado; Supabase consume el enlace en el mismo origen; después login nuevo en app host |
| Recuperación legacy | `sevenpos.pro/auth/reset-password` | Página aislada, pero enlace de login fijo y sin salida tras éxito | Actualizar contraseña en origen legacy; sign-out y salida a app `/login` |
| Login / registro legacy | `sevenpos.pro/login`, `/register` | App en root | Redirect de documento a app con query allowlist |
| Logout | App host | Estado `ACCOUNT_REQUIRED` y ruta `/login` local | Permanece en app host |
| Activación / reconciliación | App o root legacy | Retorno montaba AppShell | Estado desde `billing-subscription-status`, no query; salida canónica |
| Verificación email / recuperación nueva | App host | `authRedirectOrigin` ya seleccionaba app host | Mismo origen app, sin intercambio de códigos entre hosts |
| Bootstrap negocio | App host | Rutas SPA `/setup-business`, `/enroll-device` | Permanecen en app host; rutas legacy root redirigen a app |
| Rutas privadas legacy | Root / www | Podían montar AppShell | Redirect externo a ruta equivalente del app host |

`www.sevenpos.pro` debe conservar el origen de cualquier callback PKCE ya iniciado allí. Verificar la redirección 307 configurada en Vercel antes del corte; si intercepta `/auth/callback` o `/auth/reset-password`, es un bloqueo de esos flujos y requiere una excepción de configuración alojada en una fase posterior. No se cambió Vercel aquí.

La consulta de suscripción ignora `status`/`payment_id` de la URL. El resultado sale de la función alojada; no se transportan sesión, tokens ni almacenamiento del navegador al app host. La sesión de root no cruza de origen: tras un callback legacy completado el usuario vuelve a autenticarse en app.
