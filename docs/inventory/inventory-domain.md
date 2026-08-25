# SevenPOS — Inventory Domain Specification

## 1. Principio Fundamental
El inventario de SevenPOS se rige por el principio de **Stock Derivado del Ledger de Movimientos**. El stock de un producto no es un número editable arbitrariamente, sino el resultado matemático de:
\[
\text{Stock Actual} = \sum \text{quantity\_delta}
\]

## 2. Tipos Canónicos de Movimiento (`MovementType`)
- `OPENING`: Inventario inicial o apertura de existencias.
- `ENTRY`: Entrada manual de mercadería (compra local, reposición).
- `ADJUSTMENT_IN`: Ajuste positivo derivado de conteo físico o reconciliación.
- `ADJUSTMENT_OUT`: Ajuste negativo derivado de conteo físico o discrepancia.
- `WASTE`: Merma, merma por vencimiento, rotura o pérdida de mercadería.

## 3. Motivos de Movimiento (`ReasonCode`)
- `PHYSICAL_COUNT`: Conteo físico de inventario.
- `DAMAGED`: Mercadería dañada o deteriorada.
- `EXPIRED`: Producto vencido.
- `LOST`: Pérdida o extravío.
- `INTERNAL_USE`: Consumo interno del negocio.
- `DATA_CORRECTION`: Corrección de error de digitación anterior.
- `OTHER`: Otros motivos documentados en la nota.

## 4. Gestión de Lotes y Vencimientos
- La tabla `inventory_lots` contiene los metadatos del lote (`lot_code`, `expiration_date`).
- **El stock de un lote** se calcula estrictamente como \(\sum (\text{quantity\_delta WHERE lot\_id} = X)\).
- **Stock No Asignado (Unallocated)**: Representa el stock que no pertenece a ningún lote específico:
  \[
  \text{Unallocated Stock} = \text{Stock Total} - \sum (\text{Stock de Lotes})
  \]
- **Regla de Salida**: Una merma o salida sin lote asignado solo puede consumir stock no asignado, impidiendo que disminuya implícitamente existencias de lotes identificados.

## 5. Estados de Stock (`InventoryStockStatus`)
- `AVAILABLE`: `current_stock > 0` y no clasificado como bajo.
- `LOW_STOCK`: `current_stock > 0` y `minimum_stock IS NOT NULL` y `current_stock <= minimum_stock`.
- `OUT_OF_STOCK`: `current_stock <= 0` (el sistema bloquea existencias negativas por defecto).
