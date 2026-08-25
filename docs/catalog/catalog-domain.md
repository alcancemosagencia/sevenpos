# SevenPOS — Dominio de Catálogo (AG-04)

Este documento define el modelo conceptual, entidades de dominio, reglas de negocio e invariantes para el módulo **Catálogo** de SevenPOS.

---

## 1. Principio: Catálogo vs. Inventario

- **Catálogo (AG-04)**: Define la estructura, precios, descripciones, unidades de medida, categorías, identificadores y presentaciones de venta que un negocio comercializa. Un producto existe en el catálogo con un precio de venta y costo de referencia incluso si aún no tiene movimientos de stock.
- **Inventario (AG-05)**: Gestionará existencias físicas, movimientos (entradas, salidas, mermas, ajustes), lotes, vencimientos, cálculo de costo promedio ponderado y alertas de reposición.

---

## 2. Entidades Principales

### A. Categoría (`Category`)
- Clasificación de productos por departamentos o familias.
- Atributos: `id` (UUID), `businessId`, `name`, `description`, `color` (token HEX semántico), `active`, `createdAt`, `updatedAt`.
- Reglas:
  - Nombres normalizados sin duplicados activos en el mismo negocio (case-insensitive).
  - Al desactivar una categoría, sus productos asociados mantienen la relación histórica pero la categoría deja de estar disponible para nuevos productos.

### B. Producto Base (`Product`)
- Representa la unidad de venta elemental del catálogo.
- Atributos: `id` (UUID), `businessId`, `categoryId` (opcional), `name`, `description`, `sku` (normalizado mayúsculas), `barcode` (string), `baseUnit` (`UNIT`, `KG`, `G`, `L`, `ML`, `M`), `salePrice` (entero en minor units), `costPrice` (costo de referencia en minor units), `minimumStock` (umbral entero), `imagePath`, `featured`, `active`, `createdAt`, `updatedAt`.
- Reglas:
  - `salePrice >= 0` obligatorio.
  - `costPrice` es un valor manual de referencia.
  - Desactivación lógica (`active = false`) en lugar de eliminación física para preservar consistencia histórica de futuras ventas.

### C. Presentación de Producto (`ProductPresentation`)
- Formatos agrupados o de embalaje (Pack x6, Caja x24, Display x12) asociados a un producto base.
- Atributos: `id`, `businessId`, `productId`, `name`, `description`, `unitFactor` (entero positivo), `salePrice` (minor units independiente), `sku`, `barcode`, `imagePath`, `active`.
- Reglas:
  - `unitFactor` es un entero positivo $\ge 1$ que define cuántas unidades base componen la presentación.
  - El precio `salePrice` es totalmente independiente y editable (no se fuerza una multiplicación rígida).
  - En el futuro POS (AG-06), vender 1 presentación descontará `unitFactor` unidades del inventario base.

---

## 3. Registro Central de Identificadores (`catalog_identifiers`)

Para garantizar que un SKU o Código de barras no pueda duplicarse entre un Producto y una Presentación dentro del mismo negocio:
- Se registra en la tabla `catalog_identifiers` con restricción `UNIQUE(business_id, identifier_type, identifier_value)`.
- El servicio de dominio `ProductIdentifierService` valida la disponibilidad antes de cualquier inserción o modificación.
- **Normalización de SKU**: Se convierte a mayúsculas sin espacios extremos (`abc-1` $\rightarrow$ `ABC-1`).
- **Conservación de Barcode**: Se almacena como `TEXT` preservando ceros iniciales (`00123` $\ne$ `123`).

---

## 4. Almacenamiento de Imágenes

- **No BLOBs en SQLite**: Las imágenes se almacenan en el sistema de archivos controlado (`AppData/product-images/{productId}/primary.webp`) con redimensionado máximo a 1600px y compresión WebP.
- En entorno de desarrollo web, se almacenan como Blobs en `IndexedDB` para no saturar la cuota de `localStorage`.
