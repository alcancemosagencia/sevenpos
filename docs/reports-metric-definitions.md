# SevenPOS.pro — Definiciones de Métricas e Inteligencia Operativa (AG-11)

Este documento define la semántica formal, fórmulas de cálculo, fuentes de datos y criterios de divulgación para el módulo de Reportes e Inteligencia Operativa de **SevenPOS.pro**.

---

## 1. Principios Fundamentales

1. **Exactitud Contable y Financiera Estricta**: No se realizan extrapolaciones, promedios inventados ni estimaciones arbitrarias sobre datos faltantes.
2. **Transparencia en Calidad de Costos**: La ganancia bruta y el resultado operativo dependen directamente de la presencia y fidelidad de los snapshots de costo unitario (`costQualitySnapshot === 'REAL'`).
3. **Local-First en SQLite**: Todos los cálculos operan directamente sobre la base de datos local SQLite de la caja registradora, garantizando funcionamiento 100% offline y privacidad de datos.
4. **Aislamiento Multitenant**: Toda consulta agrega exclusivamente registros filtrados por `business_id`.

---

## 2. Definiciones de Métricas por Módulo

### A. Módulo de Ventas y Resumen Ejecutivo

| Métrica | Definición / Fórmula | Unidad | Fuente de Datos |
| :--- | :--- | :--- | :--- |
| **Ventas Netas** | $\sum \text{total}$ de ventas con `status = 'COMPLETED'` en el período | Moneda menor (centavos) | `sales.total` |
| **Cantidad de Tickets** | Conteo de ventas completadas en el período | Entero | `count(sales.id)` |
| **Ticket Promedio** | $\frac{\text{Ventas Netas}}{\text{Cantidad de Tickets}}$ | Moneda menor | Derivado |
| **Descuentos Otorgados** | $\sum \text{discount\_total}$ de ventas completadas | Moneda menor | `sales.discount_total` |
| **Cobertura de Costo (%)** | $\frac{\sum \text{line\_total (con costQuality = 'REAL')}}{\sum \text{line\_total (todas las líneas elegibles)}} \times 100$ | Porcentaje (0.0% a 100.0%) | `sale_items` |
| **Ganancia Bruta Conocida** | $\sum (\text{line\_total} - \text{line\_cost\_total})$ para líneas con snapshot de costo 'REAL' | Moneda menor | `sale_items` |

#### Reglas de Visualización de Ganancia Bruta y Resultado Operativo:
- **Cobertura = 100%**: Se presenta como *Ganancia Bruta* y se habilita el cálculo del *Resultado Operativo Estimado* ($\text{Ganancia Bruta} - \text{Gastos Operativos}$).
- **Cobertura < 100%**: Se rotula explícitamente como *Ganancia Bruta Conocida* y se indica el porcentaje de cobertura. **El Resultado Operativo Global NO se muestra**; en su lugar, se presentan las métricas individuales por separado y la *Ganancia Bruta Conocida* con divulgación clara.

---

### B. Módulo de Gastos y Finanzas

| Métrica | Definición / Fórmula | Unidad | Fuente de Datos |
| :--- | :--- | :--- | :--- |
| **Gastos Operativos Totales** | $\sum \text{amount}$ de gastos operativos en el período | Moneda menor | `operating_expenses.amount` |
| **Compras Recibidas** | $\sum \text{line\_cost\_total}$ de recepciones de mercadería (`received_at` en período) | Moneda menor | `purchase_receipt_items` |
| **Órdenes de Compra Abiertas** | Conteo y suma de órdenes con `status IN ('DRAFT', 'ORDERED')` | Entero / Moneda menor | `purchase_orders` |
| **Resultado Operativo Parcial** | $\text{Ganancia Bruta Conocida} - \text{Gastos Operativos}$ | Moneda menor | Derivado |

---

### C. Módulo de Auditoría de Cajas (Cash Discrepancies)

Para todas las sesiones de caja con `status = 'CLOSED'` y arqueo físico completado (`counted_cash_amount IS NOT NULL`):

| Métrica | Definición / Fórmula | Significado |
| :--- | :--- | :--- |
| **Diferencia Neta de Caja** | $\sum \text{difference\_amount}$ | Balance neto (sobrantes menos faltantes) |
| **Varianza Absoluta de Caja** | $\sum |\text{difference\_amount}|$ | Magnitud total de descuadres físicos ocurridos |
| **Sesiones con Descuadre** | $\text{count}(|\text{difference\_amount}| > 0)$ | Cantidad de turnos con discrepancia |
| **Sesiones Cerradas Auditadas** | $\text{count}(\text{sesiones cerradas con arqueo})$ | Total de turnos evaluados |

---

### D. Módulo de Inventario

| Métrica | Definición / Fórmula | Unidad |
| :--- | :--- | :--- |
| **Valor Total Estimado** | $\sum (\frac{\text{stock\_quantity}}{1000} \times \text{cost\_minor})$ para productos activos | Moneda menor |
| **Productos con Stock** | Conteo de productos activos con $\text{stock\_quantity} > 0$ | Entero |
| **Productos con Bajo Stock** | Conteo de productos activos donde $0 < \text{stock\_quantity} \le \text{min\_stock\_alert}$ | Entero |
| **Productos Agotados** | Conteo de productos activos donde $\text{stock\_quantity} \le 0$ | Entero |

---

### E. Módulo de Clientes

| Métrica | Definición / Fórmula | Unidad |
| :--- | :--- | :--- |
| **Tasa de Identificación** | $\frac{\text{Ventas con Cliente Identificado}}{\text{Ventas Totales}} \times 100$ | Porcentaje |
| **Clientes Activos en Período** | Clientes con al menos 1 ticket de compra completado en el rango | Entero |
| **Cliente Top** | Cliente con mayor facturación agregada en el período | Nombre / Moneda menor |

---

## 3. Especificación de Exportación CSV (RFC 4180)

Los reportes exportables generan archivos CSV estándar con:
- Encabezados claros en español.
- Formato decimal en moneda mayor (ej. `1250.50`).
- Escapado de caracteres especiales (comas, comillas dobles y saltos de línea envueltos entre `"` con comillas duplicadas `""`).
- Aislamiento estricto por `business_id`.
