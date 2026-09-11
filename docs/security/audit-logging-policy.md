# Política de Registro de Auditoría y Seguridad — SevenPOS.pro

Esta política establece los estándares de integridad, inmutabilidad, minimización de datos personales y sanitización aplicables al subsistema de auditoría de SevenPOS (**AG-12**).

---

## 1. Principio de Inmutabilidad (Append-Only)

1. **Triggers a Nivel de Base de Datos:**
   La tabla `audit_events` cuenta con triggers SQLite `BEFORE UPDATE` y `BEFORE DELETE` (`trg_audit_events_no_update` y `trg_audit_events_no_delete`) que abortan cualquier intento de modificación o borrado directo mediante `RAISE(ABORT, ...)`.
2. **Restricción de Integridad Referencial:**
   La clave foránea `FOREIGN KEY (business_id) REFERENCES businesses(id)` utiliza `ON DELETE RESTRICT`. Está estrictamente prohibido el uso de `ON DELETE CASCADE` en la bitácora de auditoría para garantizar que el historial nunca se destruya automáticamente.

---

## 2. Política de Sanitización de Metadatos

1. **Lista Negra de Claves Sensibles:**
   El pipeline `metadataSanitizer` evalúa de forma recursiva (hasta 6 niveles de profundidad) todas las propiedades del objeto de metadatos. Cualquier clave que coincida (case-insensitive) con patrones de credenciales (`password`, `token`, `secret`, `hash`, `pin`, `cvv`, `pan`, `cardnumber`, `authorization`, `privatekey`, `refreshtoken`, `accesstoken`, `seed`) es redactada automáticamente (`"[REDACTED]"`).
2. **Límite de Tamaño de Payload (8 KB Ceiling):**
   El tamaño del JSON serializado no puede exceder los 8.192 bytes UTF-8. En caso de superarlo, se podan los campos no esenciales y se añade el indicador `_metadataTruncated: true`.

---

## 3. Minimización de Datos Personales (PII)

Para eventos relacionados con clientes (`customer.created`, `customer.updated`), la bitácora almacena únicamente `customerNameSnapshot`. Datos sensibles como RUT/DNI, teléfono, correo electrónico o dirección física no forman parte del payload de auditoría.

---

## 4. Atomicidad y Consistencia Transaccional (ACID)

En operaciones críticas de base de datos (ventas, arqueos de caja, gastos operativos, recepciones de compras y ajustes de stock), los eventos de auditoría se insertan dentro del mismo bloque `BEGIN IMMEDIATE ... COMMIT`. Si la transacción de negocio falla y se ejecuta un `ROLLBACK`, el registro de auditoría asociado se revierte de forma atómica.
