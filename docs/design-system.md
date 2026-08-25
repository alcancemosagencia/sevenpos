# SevenPOS Design System — Foundations (AG-01)

## 1. Visión y Filosofía

SevenPOS es un sistema POS de calidad comercial premium para minimarkets, bodegas y pequeños comercios. Su lenguaje visual se basa en una alta densidad de información, contraste controlado, superficies oscuras calibradas (no negro plano) y sobriedad operacional inspirada en la arquitectura de *Mi Pulpería*, integrando la identidad tecnológica de SevenPOS.

---

## 2. Tipografía

* **Familia principal**: `Urbanist`, sans-serif.
* **Escala y Pesos**:
  * **Page Title (h1)**: `text-2xl` a `text-3xl` (`font-bold`, `tracking-tight`).
  * **Card / Section Title (h3)**: `text-sm` a `text-base` (`font-bold`).
  * **KPI Main Value**: `text-xl` a `text-2xl` (`font-bold`).
  * **Body Text**: `text-xs` a `text-sm` (`font-normal` o `font-medium`).
  * **Secondary / Supporting Text**: `text-xs` (`font-medium`, `text-text-secondary`).
  * **Captions / Microcopy**: `text-[10px]` a `text-[11px]` (`font-medium`, `text-text-tertiary`).

---

## 3. Tokens Semánticos de Superficie y Color

### Dark Mode (Prioritario)
* `background`: `#090a0f`
* `sidebar-bg`: `#0f1118`
* `surface`: `#141722` (Cards de KPIs y paneles)
* `surface-secondary`: `#191d2c` (Buscadores, inputs, tags)
* `surface-raised`: `#1f2334` (Dropdowns, modales, overlays)
* `surface-hover`: `#1e2233`
* `surface-selected`: `#24293c`
* `border-subtle`: `rgba(255, 255, 255, 0.05)`
* `border-default`: `rgba(255, 255, 255, 0.09)`
* `border-strong`: `rgba(255, 255, 255, 0.16)`
* `text-primary`: `#f8fafc`
* `text-secondary`: `#94a3b8`
* `text-tertiary`: `#64748b`

### Light Mode
* `background`: `#f8fafc`
* `sidebar-bg`: `#ffffff`
* `surface`: `#ffffff`
* `surface-secondary`: `#f1f5f9`
* `surface-raised`: `#ffffff`
* `surface-hover`: `#f1f5f9`
* `surface-selected`: `#e2e8f0`
* `border-subtle`: `#f1f5f9`
* `border-default`: `#e2e8f0`
* `border-strong`: `#cbd5e1`
* `text-primary`: `#0f172a`
* `text-secondary`: `#64748b`
* `text-tertiary`: `#94a3b8`

### Marca y Acentos
* `brand-primary`: `#0066ff` (Azul eléctrico comercial)
* `brand-hover`: `#0052cc`
* `brand-secondary`: `#7c3aed` (Violeta tecnológico)
* `brand-gradient`: `linear-gradient(135deg, #0066ff 0%, #7c3aed 100%)` (Uso exclusivo en branding, badges de estatus especial y highlights selectivos).

### Estados Semánticos
* `status-success`: `#10b981` (Emerald)
* `status-warning`: `#f59e0b` (Amber)
* `status-danger`: `#ef4444` (Rose/Red)
* `status-info`: `#3b82f6` (Blue)

---

## 4. Radios Semánticos

* `--radius-control`: `0.5rem` (8px) — Inputs, search pills, tags compactos.
* `--radius-button`: `0.75rem` (12px) — Botones de acción, items de sidebar y selectores.
* `--radius-card`: `1rem` (16px) — Cards de KPIs, paneles de historial y productos más vendidos.
* `--radius-surface`: `1.25rem` (20px) — Contenedores grandes.
* `--radius-modal`: `1.5rem` (24px) — Modales y diálogos.

---

## 5. Elevación y Sombras

* No se utilizan sombras saturadas en Dark Mode; la jerarquía se establece mediante el escalonamiento de luminosidad de superficies y bordes sutiles (`border-default`).
* En Light Mode se aplican sombras suaves y difusas (`--shadow-subtle`, `--shadow-card`, `--shadow-elevated`).

---

## 6. App Shell y Proporciones

* **Sidebar**: Ancho estándar `240px` (colapsable a `64px`), posición fija lateral, navegación estructurada con grupos colapsables (+/-), indicador de atajos de teclado (`F2`), usuario actual y versión compacta del isotipo/logo.
* **Topbar**: Altura compacta `56px` (`h-14`), borde inferior sutil, buscador global tipo pill con placeholder `Buscar...`, botón de upgrade `Actualizar a Pro`, selector de país (`CL`, `CO`, `VE`), alternador de tema (`Dark / Light`) e indicadores de estado.
* **PageContainer**: Ancho máximo `1440px`, padding uniforme `px-4 sm:px-6 md:px-8 py-6` y scroll independiente.
* **PageHeader**: Título de página con tipografía Urbanist, subtítulo explicativo, selector de rango temporal y botón de acción primaria de alto contraste.

---

## 7. Perfiles Regionales (Country Foundations)

Estructura desacoplada y tipada para localización:
* **Chile (CL)**: Moneda CLP (`$`), formato sin decimales, IVA 19%, prefijo +56.
* **Colombia (CO)**: Moneda COP (`$`), formato sin decimales, IVA 19%, prefijo +57.
* **Venezuela (VE)**: Moneda VES (`Bs.`), secundaria USD (`$`), decimales con coma, IVA 16%, prefijo +58, proveedor BCV futuro.

---

## 8. Reglas Canónicas de Layout y Toolbars (AG-10B)

### 8.1. Administrative Page Layout Rule
Toda pantalla o vista administrativa de SevenPOS debe componerse estrictamente según el patrón jerárquico:
```text
AppShell
└── PageContainer (maxWidth: default | narrow | full)
    ├── PageHeader (title, subtitle, actions)
    ├── KPI Section (si aplica)
    ├── FilterToolbar (standalone search & filters)
    └── Main Content (Table | CardGrid | EmptyState)
```
Queda estrictamente prohibido utilizar `<div>` crudos con paddings manuales o encabezados sin `PageHeader` en las páginas principales.

### 8.2. Standalone Toolbar Rule (Zero Double-Card)
* Los controles de búsqueda (`SearchInput`) y filtrado (`Select`) son **elementos de primer nivel** (standalone) que descansan directamente sobre la superficie del `PageContainer`.
* **Prohibición**: No envolver barras de búsqueda/filtros dentro de una tarjeta exterior decorativa (`<Card>` o `bg-surface border border-border-default rounded-xl p-4`).
* **Geometría y Ritmo**:
  * Desktop (≥1024px): Búsqueda con `flex-1` (mínimo 240px) y selects con ancho acotado / auto.
  * Tablet (768px): `flex-wrap` con distribución equilibrada.
  * Mobile (390px): Stack vertical ordenado al 100% de ancho sin desborde horizontal.
  * Componente canónico: `<FilterToolbar className="mb-4">` (wrapper puramente estructural de layout sin estilos de Card).

### 8.3. Zero Native Controls Rule (AG-10A)
* 0 `<select>` nativos del sistema operativo $\rightarrow$ Uso obligatorio del adapter [`Select.tsx`](file:///c:/Users/Omar/Documents/SevenPOS/src/components/ui/Select.tsx).
* 0 `<input type="date">` nativos $\rightarrow$ Uso obligatorio de [`DatePicker.tsx`](file:///c:/Users/Omar/Documents/SevenPOS/src/components/ui/DatePicker.tsx).
* 0 `window.alert()` / `window.confirm()` $\rightarrow$ Uso obligatorio de modales accesibles ([`ConfirmModal.tsx`](file:///c:/Users/Omar/Documents/SevenPOS/src/components/ui/ConfirmModal.tsx)).

