# ADR-001: Local-First Architecture with Tauri 2 + SQLite + Secure Storage

## Status
**ACCEPTED** (Tauri Gate: PASS)

## Context
SevenPOS es un sistema POS comercial de alta velocidad diseñado para operar de forma ininterrumpida en comercios minoristas y puntos de venta en Chile, Colombia y Venezuela.
En estos entornos de comercio real, la conectividad a Internet es susceptible a intermitencias, caídas de DNS o latencias elevadas. Un sistema POS no puede bloquear transacciones ni impedir el cobro a clientes ante la falta de conexión.

Por tanto, SevenPOS adopta el principio fundamental **Local-First**: el dispositivo de escritorio es el *Source of Truth* operacional primario para datos del negocio, inventario, transacciones y credenciales.

## Decision
1. **Framework de Escritorio**: Se selecciona **Tauri 2** sobre Electron.
   - *Rationale*: Consumo de memoria significativamente menor (~40MB vs ~200MB de Electron), binarios nativos compactos (<15MB installer), arranque rápido y arquitectura de seguridad basada en permisos/capabilities de mínimo privilegio.
2. **Motor de Persistencia**: **SQLite** local mediante el plugin oficial `@tauri-apps/plugin-sql` y `tauri-plugin-sql` (con `sqlite:sevenpos.db`).
   - *Rationale*: Base de datos relacional embebida transaccional (ACID), soporte de índices, Foreign Keys y evolución de esquema mediante migraciones versionadas canónicas (`0001_initial_core.sql`).
3. **Almacenamiento Seguro (Vault)**: **Tauri Stronghold** (`sevenpos.stronghold`) para el material de autenticación de PIN y secretos.
   - *Rationale*: Previene el almacenamiento de PIN en texto plano o en tablas SQLite sin cifrar. El PIN se procesa con Web Crypto SHA-256 + salt de 16 bytes y se sella en el vault cifrado.
4. **Identificadores y Tiempo**:
   - Identificadores UUID v4 offline sin colisiones.
   - Timestamps en formato ISO-8601 UTC en almacenamiento SQLite.
5. **Tipografía Offline**: Urbanist empaquetada localmente mediante `@fontsource/urbanist` para garantizar 0 peticiones de red externas en runtime.

## Alternatives Considered
- **Electron + SQLite**: Descartado debido al alto overhead de RAM/CPU, tamaño de binario (>120MB) y superficie de ataque más amplia.
- **Web SPA + IndexedDB / LocalStorage**: Descartado para producción porque el almacenamiento en navegador es volátil, no soporta control de concurrencia ACID de grado POS ni acceso a periféricos de hardware nativo (impresoras térmicas ESC/POS, puertos serie).

## Consequences
### Positive
- Operación 100% offline sin dependencia de red.
- Cero fugas de datos o credenciales sensibles en `localStorage`.
- Modelo de arquitectura limpia con separación de capas (`domain`, `application`, `infrastructure`).
- Capacidad de evolucionar a multi-platform (Windows $\rightarrow$ Android tablet / SmartPOS) mediante adaptadores de infraestructura (`PrintPort`, `KeyboardWedgeScanner`).

### Known Trade-offs & Next Steps
- La protección del secreto de bootstrap del vault Stronghold se robustecerá con Windows DPAPI / OS Credential Manager en fases posteriores.
- El plugin de actualización (Tauri Updater) queda integrado en base de código pero pendiente de clave privada y endpoint en release infrastructure.
