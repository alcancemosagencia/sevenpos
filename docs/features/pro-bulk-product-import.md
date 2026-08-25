# Feature Specification — Carga Masiva Inteligente (Cargar Lista PRO)

## 1. Visión y Propósito

**Cargar Lista PRO** es un módulo acelerador de onboarding y actualización de catálogo para SevenPOS. Permite a los comerciantes importar cientos de productos en segundos mediante el procesamiento inteligente de documentos heterogéneos provistos por distribuidores o emitidos en facturas físicas/digitales.

---

## 2. Formatos de Entrada Soportados

1. **Documentos PDF**:
   - Listas de precios oficiales de distribuidores y mayoristas.
   - Facturas electrónicas y guías de despacho.
   - Órdenes de compra y catálogos de proveedores.

2. **Hojas de Cálculo y Tablas**:
   - Excel (`.xlsx`, `.xls`).
   - Archivos delimitados (`.csv`, `.tsv`).

3. **Imágenes y Fotografías**:
   - Fotos tomadas desde cámara móvil de listas impresas o pizarras de precios.
   - Capturas de pantalla de chats de WhatsApp o correos electrónicos.
   - Fotos de boletas y facturas físicas.

---

## 3. Flujo Canónico de Extracción y Validación con IA

El proceso sigue un principio estricto de **Zero Unconfirmed Mutations**: ninguna extracción con IA inserta registros directamente en la base de datos sin aprobación explícita del usuario.

```text
[ Subir Archivo / Foto ]
         ↓
[ Extracción con IA / OCR ]
         ↓
[ Normalización y Validación de Tipos ]
         ↓
[ Detección de Duplicados / Conflictos ]
         ↓
[ Tabla Interactiva de Previsualización (Review Gate) ]
         ↓
[ Mapeo de Categorías / Unidades / Proveedores ]
         ↓
[ Confirmación del Usuario ]
         ↓
[ Inserción Transaccional en SQLite / Catálogo ]
```

---

## 4. Campos Extraídos y Mapeados

* **Identificación**: Nombre del producto, descripción, marca.
* **Códigos**: Código de barras (EAN-13, UPC, Code-128), SKU proveedor / SKU interno.
* **Precios**: Precio de venta sugerido o fijado, costo de compra / costo de referencia.
* **Unidades y Presentaciones**: Unidad base (u, kg, l, m), empaque / formato (pack x6, caja x24, display).
* **Clasificación**: Categoría / familia sugerida, proveedor asociado.
* **Inventario Inicial (Opcional)**: Stock entrante, lote y fecha de vencimiento.

---

## 5. Protocolo de Seguridad y Detección de Duplicados

Antes de presentar la previsualización final, el motor de importación evalúa la base de datos local contra los registros extraídos:

1. **Coincidencia Exacta por Código**:
   - Detección de `barcode` o `sku` ya existentes en la base de datos.
   - Opción para el usuario: *Actualizar precio / existencias* o *Ignorar duplicado*.

2. **Coincidencia Difusa por Nombre (Fuzzy Match)**:
   - Detección de similitud de cadenas (Levenshtein / Trigram) para evitar crear productos redundantes como "Coca Cola 1.5L" y "Coca-Cola 1.5 Lts".

3. **Detección de Presentaciones**:
   - Si el producto base existe pero la lista incluye un pack o caja, el sistema sugiere vincularlo como una nueva `ProductPresentation`.

---

## 6. Tier y Disponibilidad

* **Plan**: Exclusivo para suscriptores **SevenPOS PRO**.
* **Estado en AG-07B**: Placeholder de UI documentado y preparado con modal informativo de prelanzamiento.
