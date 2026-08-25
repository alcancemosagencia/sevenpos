# ADR-003: Inventory Quantity Model (Fixed-Scale Integer)

## Estado
Aprobado (AG-05)

## Contexto
SevenPOS gestiona tanto productos contables por unidad discreta (`UNIT`) como productos fraccionarios medidos por masa, volumen o longitud (`KG`, `G`, `L`, `ML`, `M`).
El uso de números de punto flotante binarios (`REAL` / `FLOAT` / `DOUBLE`) introduce errores de redondeo irreparables (ej. `0.1 + 0.2 = 0.30000000000000004`), lo que destruye la reconciliación del ledger y la cuadratura de existencias.

## Decisión
Adoptar un modelo de **Entero Escalado Fijo (Scaled Integer)** con factor de escala:
```ts
export const QUANTITY_SCALE = 1000; // 3 decimales exactos
```

### Representación
- \(1\text{ UNIT} \rightarrow 1000\)
- \(0.750\text{ KG} \rightarrow 750\)
- \(1.250\text{ L} \rightarrow 1250\)
- \(2.500\text{ M} \rightarrow 2500\)

### Invariantes y Reglas de Dominio
1. **Almacenamiento**: Todas las cantidades (`quantity_delta`, `minimum_stock`, etc.) se almacenan en SQLite como `INTEGER NOT NULL`.
2. **Validación de Unidad**:
   - `UNIT`: Requiere obligatoriamente que `scaled % QUANTITY_SCALE === 0` (cantidades enteras). Rechaza decimales como `1.5 u`.
   - `KG`, `G`, `L`, `ML`, `M`: Admiten hasta 3 cifras decimales.
3. **Seguridad Aritmética**: Todas las transformaciones validan `Number.isSafeInteger()` para evitar desbordamientos del tipo numérico de JavaScript.

## Consecuencias
- Cero errores de redondeo de punto flotante en operaciones de inventario.
- Modelo determinista y testeable al 100%.
- Reutilización inmediata del value object `Quantity.ts` en futuros módulos de Compras, Ventas y POS.
