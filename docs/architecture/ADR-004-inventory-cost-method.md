# ADR-004: Inventory Cost Method (Weighted Average Cost State Machine)

## Estado
Aprobado (AG-05)

## Contexto
SevenPOS necesita valorar existencias y determinar costos unitarios confiables a partir de entradas y movimientos reales sin sobreimplementar un motor complejo FIFO/LIFO contable antes del módulo de Compras.

## Decisión
Implementar un modelo de **Costo Promedio Ponderado Secuencial (Weighted Average Cost - WAC)** con escala interna de cálculo `COST_CALC_SCALE = 10000` (evitando truncamientos sub-centavo).

### Máquina de Estados Secuencial
1. **Entradas con Costo (`OPENING` / `ENTRY` con costo)**:
   \[
   \text{Nuevo Valor Total} = (\text{Cantidad Previa} \times \text{Costo Promedio Actual}) + (\text{Cantidad Entrante} \times \text{Costo Unitario Entrante})
   \]
   \[
   \text{Nueva Cantidad} = \text{Cantidad Previa} + \text{Cantidad Entrante}
   \]
   \[
   \text{Nuevo Costo Promedio} = \frac{\text{Nuevo Valor Total}}{\text{Nueva Cantidad}}
   \]
   - Calidad de Costo: `REAL`.

2. **Ajustes de Aumento sin Costo (`ADJUSTMENT_IN`)**:
   - Las unidades ingresadas adoptan el costo promedio vigente.
   - \(\text{Nuevo Valor Total} = \text{Valor Previo} + (\text{Cantidad Entrante} \times \text{Costo Promedio Actual})\).
   - El costo promedio unitario se mantiene inalterado.

3. **Salidas y Mermas (`WASTE` / `ADJUSTMENT_OUT`)**:
   - Las unidades que salen se valoran al costo promedio actual.
   - \(\text{Nuevo Valor Total} = \text{Valor Previo} - (\text{Cantidad Saliente} \times \text{Costo Promedio Actual})\).
   - El costo promedio unitario se mantiene inalterado.

4. **Stock Cero (\(\text{Cantidad} = 0\))**:
   - Valor de inventario = \$0.
   - El último costo promedio conocido se conserva en el read model como referencia histórica hasta una nueva entrada con costo.

5. **Entrada sin Costo con Stock Cero**:
   - Calidad de Costo: `UNKNOWN` (o fallback a `cost_price` de catálogo con etiqueta explícita `"Costo de referencia"`).
   - La UI nunca muestra "Costo promedio" para valores no justificados por movimientos de compra.

## Consecuencias
- Trazabilidad económica transparente entre inventario físico y monetario.
- Diferenciación rigurosa en la UI entre `Costo promedio` (basado en entradas reales) y `Costo de referencia` (declarativo de catálogo).
