# SevenPOS Sales Domain Specification (AG-06)

## 1. Transacción de Venta Atómica
Toda venta (`CompleteSale`) se ejecuta como una transacción atómica única en SQLite (`BEGIN IMMEDIATE` $\rightarrow$ `COMMIT` / `ROLLBACK`).
Abarca:
1. Revalidación autoritativa de catálogo (productos, presentaciones, precios oficiales, factores de conversión y estado activo).
2. Asignación determinista de inventario y lotes (**Unallocated First + Basic FEFO**).
3. Verificación de no negatividad de existencias.
4. Generación concurrente y segura de `sale_number` (`V-000001`) con `sale_sequence`.
5. Inserción de la entidad `Sale`.
6. Inserción inmutable de `SaleItem`s con snapshots históricos completos.
7. Inserción de `SalePayment`s verificando que $\sum \text{amount} \equiv \text{sale.total}$.
8. Inserción de movimientos en `inventory_movements` con `movement_type = 'SALE'` y referencias correspondientes.

## 2. Asignación de Lotes (Unallocated First + Basic FEFO)
- **Prioridad 1**: Stock sin lote (`lot_id IS NULL`).
- **Prioridad 2**: Lotes con fecha de vencimiento más próxima (`expiration_date ASC`, `created_at ASC`, `id ASC`).
- **Prioridad 3**: Lotes sin fecha de vencimiento (`created_at ASC`, `id ASC`).
- Una línea de venta (`sale_item`) puede dividirse en múltiples registros de `inventory_movements` para saldar diferentes lotes sin deuda oculta.

## 3. Modelo de Pagos y Multipago
- Códigos oficiales: `CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`, `OTHER`.
- `amount`: Monto neto aplicado a saldar la venta.
- `received_amount`: Dinero físico entregado por el cliente (solo efectivo).
- `change_amount`: Cambio entregado (`received_amount - amount`).
