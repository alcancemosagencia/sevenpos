# SevenPOS — Configuración de Email Transaccional, DNS y SMTP

**Guía de Infraestructura y Producción: INFRA-EMAIL-01**  
**Dominio de Autenticación:** `auth.sevenpos.pro`  
**Dominio Raíz:** `sevenpos.pro`  
**Proveedor SMTP:** [Resend](https://resend.com)  
**Fecha de Publicación:** Septiembre 2026

---

## 1. Identidad de Remitente y Separación Arquitectónica

SevenPOS mantiene un aislamiento estricto entre el tráfico transaccional (autenticación y seguridad de cuentas) y el tráfico comercial (marketing y CRM):

| Canal | Propósito | Plataforma | Remitente | Reply-To |
| :--- | :--- | :--- | :--- | :--- |
| **Transaccional / Auth** | OTP (8 dígitos), confirmación de registro, recuperación de contraseña, alertas de seguridad | **Supabase Auth + Resend SMTP** | `SevenPOS <cuenta@auth.sevenpos.pro>` | *(Bandeja funcional o sin Reply-To si soporte no está activo)* |
| **Comercial / CRM** | Drips de onboarding, soporte comercial, newsletters, reactivación | **GoHighLevel (GHL)** | `SevenPOS <ventas@sevenpos.pro>` / `contacto@sevenpos.pro` | `soporte@sevenpos.pro` |

> [!IMPORTANT]
> **Regla de Aislamiento:** NUNCA envíes correos de autenticación o tokens OTP a través de GoHighLevel ni campañas masivas de marketing a través de `auth.sevenpos.pro`. El subdominio `auth.sevenpos.pro` debe conservar una reputación de entrega limpia para que los correos con códigos lleguen de inmediato a la bandeja de entrada.

---

## 2. Configuración DNS en el Subdominio (`auth.sevenpos.pro`)

> [!WARNING]
> **ESTADO DE VERIFICACIÓN: PENDIENTE EN DNS**  
> El administrador debe registrar el subdominio `auth.sevenpos.pro` en el panel de Resend (**Domains $\rightarrow$ Add Domain**) y copiar los registros exactos generados por Resend en el proveedor DNS de `sevenpos.pro` (Cloudflare, Namecheap, Route53, etc.).

### A. Registros DKIM y Mailer — [EJEMPLO / PENDIENTE RESEND]
Valores típicos que genera Resend al registrar el subdominio `auth.sevenpos.pro`:

| Tipo | Host / Nombre | Valor de Ejemplo | TTL |
| :--- | :--- | :--- | :--- |
| `CNAME` | `resend._domainkey.auth.sevenpos.pro` | `dkim.resend.com.` | Auto / 3600 |
| `CNAME` | `send.auth.sevenpos.pro` | `feedback-smtp.us-east-1.amazonses.com.` | Auto / 3600 |

### B. Registro SPF (Sender Policy Framework) — [EJEMPLO / PENDIENTE RESEND]
| Tipo | Host / Nombre | Valor de Ejemplo | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `auth.sevenpos.pro` | `v=spf1 include:resend.com ~all` | Auto / 3600 |

### C. Política DMARC
El subdominio `auth.sevenpos.pro` hereda la política del dominio raíz (`_dmarc.sevenpos.pro`). Opcionalmente, se puede definir una política explícita para el subdominio:
| Tipo | Host / Nombre | Valor Recomendado | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `_dmarc.auth.sevenpos.pro` | `v=DMARC1; p=none; sp=none; rua=mailto:dmarc-reports@sevenpos.pro` | Auto / 3600 |

---

## 3. Configuración de Custom SMTP en Supabase Dashboard

1. Accede a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Navega a **Project Settings** $\rightarrow$ **Authentication** $\rightarrow$ **SMTP Settings**.
3. Activa **Enable Custom SMTP**.
4. Ingresa los siguientes valores:

| Campo | Valor |
| :--- | :--- |
| **Sender Email** | `cuenta@auth.sevenpos.pro` |
| **Sender Name** | `SevenPOS` |
| **Reply-to Email** | *(Dejar vacío o configurar buzón verificado funcional)* |
| **Host** | `smtp.resend.com` |
| **Port** | `465` (SSL) o `587` (TLS) |
| **User** | `resend` |
| **Password** | `<RESEND_API_KEY>` *(API Key generada en Resend con permisos de envío)* |

5. Haz clic en **Save Changes**.

---

## 4. Ajuste Crítico en Resend: Desactivar Tracking de Enlaces

> [!CAUTION]
> En el panel de **Resend $\rightarrow$ Domains $\rightarrow$ auth.sevenpos.pro $\rightarrow$ Settings**:
> - **Click Tracking:** `DISABLED` (Desactivado).
> - **Open Tracking:** `DISABLED` (Desactivado).
> 
> Si el tracking de clics está activo, los enlaces de confirmación de Supabase (`{{ .ConfirmationURL }}`) son reescritos por el proxy de tracking, lo que puede provocar fallas de token en clientes de correo estrictos o alterar los parámetros criptográficos.

---

## 5. Despliegue de Plantillas HTML en Supabase

Las plantillas fuente están versionadas en el repositorio bajo `supabase/templates/`:

| Archivo Fuente | Sección en Supabase Dashboard | Asunto Recomendado |
| :--- | :--- | :--- |
| `verify_account.html` | **Auth $\rightarrow$ Email Templates $\rightarrow$ Confirm signup** | `Verifica tu cuenta de SevenPOS` |
| `password_recovery.html` | **Auth $\rightarrow$ Email Templates $\rightarrow$ Reset password** | `Restablece tu contraseña de SevenPOS` |
| `email_change.html` | **Auth $\rightarrow$ Email Templates $\rightarrow$ Change email address** | `Confirma tu cambio de correo en SevenPOS` |
| `security_password_changed.html` | **Auth $\rightarrow$ Email Templates $\rightarrow$ Password changed notification** | `Aviso de seguridad: Contraseña actualizada` |
| `security_email_changed.html` | **Auth $\rightarrow$ Email Templates $\rightarrow$ Email changed notification** | `Aviso de seguridad: Correo electrónico modificado` |
| `user_invitation.html` | **Auth $\rightarrow$ Email Templates $\rightarrow$ Invite user** *(Template Only)* | `Has sido invitado a SevenPOS` |

---

## 6. Variables Soportadas en Supabase Auth Templates

| Variable | Descripción |
| :--- | :--- |
| `{{ .Token }}` | Código OTP (8 dígitos en producción) para ingresar directamente en la app. |
| `{{ .ConfirmationURL }}` | Enlace de acción directa con token criptográfico embebido. |
| `{{ .SiteURL }}` | URL base de la aplicación (`https://sevenpos.pro`). |
| `{{ .Email }}` | Dirección de correo del destinatario. |
| `{{ .Data.first_name }}` | Nombre del propietario registrado (si está disponible). |

---

## 7. Configuración de Site URL y Redirect Allowlist en Supabase

En **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ URL Configuration**:

- **Site URL:** `https://sevenpos.pro`
- **Redirect URLs Explícitas Permitidas:**
  - `https://sevenpos.pro/auth/callback`
  - `https://sevenpos.pro/auth/reset-password`
  - `http://localhost:5173/auth/callback` *(Desarrollo local web)*
  - `http://localhost:5173/auth/reset-password` *(Desarrollo local web)*

---

## 8. Experiencia Canónica de Recuperación de Contraseña

- **UX Principal:** **Enlace de Recuperación Seguro** enviado al correo (`{{ .ConfirmationURL }}`).
- Al hacer clic, el usuario abre `https://sevenpos.pro/auth/reset-password`, donde su sesión de recuperación queda automáticamente validada y puede ingresar su nueva contraseña.
- El token en texto `{{ .Token }}` se conserva en el correo únicamente como método de contingencia para terminales aislados.

---

© 2026 SevenPOS • Documentación de Arquitectura e Infraestructura Transaccional
