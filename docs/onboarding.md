# SevenPOS — Especificación y Arquitectura: Fase AG-02

**Fase**: AG-02 — Premium First Run + Country Setup + Business Setup + Owner + PIN + First Login  
**Estado**: Completado y Verificado  
**Stack**: React 19 + TypeScript + HeroUI v3.2.4 + Tailwind CSS v4 + Urbanist  

---

## 1. Visión y Flujo del Asistente (First Run Experience)

La experiencia de primer arranque de SevenPOS es una pantalla independiente del App Shell que guía al usuario desde la apertura inicial limpia hasta la creación de su cuenta de propietario y el desbloqueo mediante PIN.

```text
Bienvenida (Paso 1)
  ↓
Selección de País (Paso 2: 🇨🇱 CL / 🇨🇴 CO / 🇻🇪 VE)
  ↓
Datos del Negocio (Paso 3: Nombre, RUT/NIT/RIF, Teléfono con prefijo)
  ↓
Configuración Regional (Paso 4: Moneda base, Switch USD para VE, BCV metadata)
  ↓
Usuario Principal & PIN (Paso 5: Dueño, PIN 4 dígitos + confirmación instantánea)
  ↓
Confirmación (Paso 6: Resumen de configuración + CTA "Entrar a SevenPOS")
  ↓
Login por PIN (Pantalla de bloqueo fuera del App Shell)
  ↓
App Shell / Dashboard (/dashboard)
```

---

## 2. Máquina de Estados y Guardas de Navegación

El estado global de arranque y sesión está modelado de forma explícita y desacoplada:

```ts
onboardingStatus: 'incomplete' | 'completed';
sessionStatus: 'locked' | 'unlocked';
```

### Reglas de Entrada y Deep Linking:
1. `onboardingStatus === 'incomplete'`: Renderiza `<OnboardingFlow />`. Cualquier intento de navegación a `/dashboard`, `/pos`, etc. redirige inmediatamente al onboarding.
2. `onboardingStatus === 'completed' && sessionStatus === 'locked'`: Renderiza `<PinLoginPage />`. La aplicación permanece bloqueada hasta introducir el PIN correcto.
3. `onboardingStatus === 'completed' && sessionStatus === 'unlocked'`: Renderiza `<AppShell>` con acceso al Dashboard y los módulos de navegación.

### Cierre de Sesión / Bloqueo:
- El botón **Cerrar sesión** del Sidebar ejecuta `lockSession()`, cambiando `sessionStatus = 'locked'` y mostrando la pantalla de **PIN Login**.
- NO resetea el onboarding ni borra los datos del negocio.

---

## 3. Comportamiento Regional por País

| País | Moneda Base | Prefijo | Identificación Fiscal | Moneda Secundaria | Proveedor Tasa |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chile (CL)** | `CLP` (`$`) | `+56` | **RUT** | N/A | N/A |
| **Colombia (CO)** | `COP` (`$`) | `+57` | **NIT** | N/A | N/A |
| **Venezuela (VE)** | `VES` (`Bs.`) | `+58` | **RIF** | `USD` (opcional via switch) | Metadata `BCV` |

- **Country Cards**: Utilizan representaciones vectoriales (`CountryFlag`) que aseguran rendering idéntico y sin fallos en Windows.
- **Prefijo Telefónico**: Se asigna automáticamente según el país seleccionado y no requiere escritura manual por parte del comerciante.

---

## 4. Seguridad de PIN y Persistencia Temporal

- **Web Crypto Hashing**: El PIN de 4 dígitos no se almacena en texto plano. Se calcula un hash `SHA-256` con salt aleatorio de 16 bytes (`crypto.getRandomValues`) mediante la Web Crypto API (`hashPin`, `verifyPinHash`).
- **Persistencia Temporal**: Almacenado en `LocalStorageOnboardingRepository` bajo la clave `sevenpos-onboarding-state`.
- **Reinicio en Desarrollo**: Se incluye soporte para `?reset=true` protegido exclusivamente bajo entorno de desarrollo (`import.meta.env.DEV`), impidiendo su ejecución en producción.

---

## 5. Diseño, Layout y Responsive

- **Desktop (1440px / 1024px)**: Layout de dos columnas. Panel izquierdo con Hero visual, branding SevenPOS y render 3D contextual (`onboarding-owner.png` / `onboarding-success.png`); panel derecho con card de configuración.
- **Tablet (768px)**: Composición fluida en una sola columna para maximizar el espacio del formulario y evitar truncamientos o campos comprimidos.
- **Mobile (390px)**: Columna única, logo superior compacto, indicador de progreso y formularios accesibles sin scroll horizontal.
- **PIN Login**: Card centrada con avatar del Dueño, visor de 4 celdas, teclado numérico táctil y soporte para teclado físico de escritorio.

---

## 6. Deuda Conocida Controlada

1. **Persistencia Definitiva**: La persistencia local en `localStorage` con Web Crypto es temporal de desarrollo; la persistencia definitiva se implementará con Tauri / SQLite cifrado nativo.
2. **Seguridad y Recuperación de PIN**: En esta fase no existe flujo de recuperación de PIN olvidado (se implementará en la fase de seguridad y gestión de usuarios).
3. **Multi-usuario y Roles (RBAC)**: Solo existe el rol `Dueño` (OWNER); cajeros adicionales se construirán en la fase de Usuarios.
4. **Tasa de Cambio BCV**: La integración con scraping o API del BCV se implementará en la fase de Finanzas/Caja.
5. **Product Tour**: Se mantiene preparado el flag conceptual de primer inicio; el tour interactivo se desarrollará en su fase correspondiente.
