# Catálogo Canónico de Eventos de Auditoría — SevenPOS.pro

Este documento define la taxonomía oficial, especificación de eventos, severidad y esquemas de metadatos para la bitácora inmutable de auditoría y seguridad (**AG-12**).

---

## 1. Categorías de Auditoría (`event_category`)

| Categoría | Descripción |
|---|---|
| `AUTH` | Autenticación de usuarios, login por PIN, bloqueos de seguridad y logout. |
| `DEVICE` | Enrolamiento y vinculación de terminales físicas / desktop. |
| `SALES` | Transacciones de venta completadas y aplicación de descuentos. |
| `CASH` | Aperturas/cierres de turno de caja, discrepancias y movimientos de efectivo. |
| `INVENTORY` | Ajustes de stock manuales, deducciones por venta e ingresos por compra. |
| `CATALOG` | Creación, edición y desactivación de productos y categorías. |
| `PURCHASES` | Órdenes de compra y recepciones de mercadería con proveedores. |
| `EXPENSES` | Registro de egresos y gastos operativos del negocio. |
| `CUSTOMERS` | Creación, actualización y desactivación de clientes (PII minimizada). |
| `SECURITY` | Eventos y alertas críticas de seguridad y control de acceso. |
| `SYSTEM` | Migraciones, verificaciones de integridad y eventos internos. |

---

## 2. Matriz Canónica de Eventos

| Event Type | Categoría | Severidad | Acción | Entidad Afectada | Descripción |
|---|---|---|---|---|---|
| `auth.login.success` | `AUTH` | `INFO` | `PIN_LOGIN` | `SESSION` | Desbloqueo de terminal exitoso mediante PIN local. |
| `auth.pin.failed` | `AUTH` | `WARNING` | `PIN_FAILED` | `SECURITY` | Intento fallido de ingreso de PIN. |
| `auth.pin.locked` | `AUTH` | `CRITICAL` | `PIN_LOCKOUT` | `SECURITY` | Bloqueo preventivo de terminal por superar límite de reintentos. |
| `auth.logout` | `AUTH` | `INFO` | `SESSION_LOCKED` | `SESSION` | Bloqueo manual de terminal o cierre de sesión. |
| `device.enrolled` | `DEVICE` | `INFO` | `DEVICE_ENROLLED` | `DEVICE` | Enrolamiento exitoso de terminal en Cloud / Local. |
| `sale.completed` | `SALES` | `INFO` | `SALE_COMPLETED` | `SALE` | Venta completada y asentada en el libro mayor. |
| `sale.discount.applied` | `SALES` | `INFO` | `DISCOUNT_APPLIED` | `SALE` | Descuento aplicado en una transacción de venta. |
| `cash.shift.opened` | `CASH` | `INFO` | `OPEN_SHIFT` | `CASH_SESSION` | Apertura de turno de caja con fondo inicial. |
| `cash.shift.closed` | `CASH` | `INFO` | `CLOSE_SHIFT` | `CASH_SESSION` | Cierre y arqueo de turno de caja. |
| `cash.discrepancy.detected` | `CASH` | `WARNING` | `DISCREPANCY` | `CASH_SESSION` | Diferencia entre efectivo contado y esperado en arqueo. |
| `cash.movement.created` | `CASH` | `INFO` | `CASH_IN` / `CASH_OUT` | `CASH_MOVEMENT` | Movimiento manual de entrada/salida de efectivo. |
| `inventory.adjustment.created` | `INVENTORY` | `INFO` | `STOCK_ADJUSTMENT` | `INVENTORY_MOVEMENT` | Ajuste manual de stock por merma, conteo o corrección. |
| `inventory.stock.sale_deduction` | `INVENTORY` | `INFO` | `STOCK_DEDUCTED` | `SALE` | Deducción atómica de existencias por venta (1 por transacción). |
| `inventory.stock.purchase_entry` | `INVENTORY` | `INFO` | `STOCK_ENTRY` | `PURCHASE_RECEIPT` | Ingreso de existencias por recepción de orden de compra. |
| `product.created` | `CATALOG` | `INFO` | `CREATE_PRODUCT` | `PRODUCT` | Alta de nuevo producto en el catálogo. |
| `product.updated` | `CATALOG` | `INFO` | `UPDATE_PRODUCT` | `PRODUCT` | Modificación de precios, costos o atributos de producto. |
| `product.deactivated` | `CATALOG` | `INFO` | `DEACTIVATE_PRODUCT` | `PRODUCT` | Desactivación suave de producto (`active = 0`). |
| `category.created` | `CATALOG` | `INFO` | `CREATE_CATEGORY` | `CATEGORY` | Alta de nueva categoría de catálogo. |
| `category.updated` | `CATALOG` | `INFO` | `UPDATE_CATEGORY` | `CATEGORY` | Modificación de nombre, color o estado de categoría. |
| `category.deactivated` | `CATALOG` | `INFO` | `DEACTIVATE_CATEGORY` | `CATEGORY` | Desactivación suave de categoría (`active = 0`). |
| `purchase.order.created` | `PURCHASES` | `INFO` | `CREATE_PURCHASE_ORDER` | `PURCHASE_ORDER` | Creación de orden de compra para proveedor. |
| `purchase.receipt.created` | `PURCHASES` | `INFO` | `RECEIVE_PURCHASE` | `PURCHASE_RECEIPT` | Recepción de mercadería asociada a orden de compra. |
| `expense.created` | `EXPENSES` | `INFO` | `CREATE_EXPENSE` | `OPERATING_EXPENSE` | Registro de gasto operativo o egreso. |
| `customer.created` | `CUSTOMERS` | `INFO` | `CREATE_CUSTOMER` | `CUSTOMER` | Alta de nuevo cliente (PII minimizada: solo nombre). |
| `customer.updated` | `CUSTOMERS` | `INFO` | `UPDATE_CUSTOMER` | `CUSTOMER` | Actualización de datos o estado de cliente. |

---

## 3. Eventos Explícitamente Diferidos (Deferred)

1. **`auth.login.failed` (Pre-Auth / Pre-Business):**
   - **Razón:** Los fallos de login en Supabase Cloud ocurren previo a conocer el `business_id` del usuario (o con correos inexistentes). Debido a que `audit_events.business_id TEXT NOT NULL` y la clave foránea `FOREIGN KEY (business_id) REFERENCES businesses(id)` son estrictas, estos eventos se gestionan en los logs de Supabase Auth y no se registran en la bitácora SQLite local.
2. **`product.deleted` / `category.deleted`:**
   - **Razón:** La carrocería del catálogo de SevenPOS opera exclusivamente mediante borrado lógico / desactivación suave (`active = 0`).
