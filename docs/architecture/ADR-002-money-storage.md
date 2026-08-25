# ADR-002: Almacenamiento y Representación Monetaria (Minor Units)

- **Estado**: Aprobado
- **Fecha**: 2026-08-22
- **Fase**: AG-04

---

## 1. Contexto

En aplicaciones de Punto de Venta (POS) y facturación comercial, el almacenamiento de importes monetarios como valores de punto flotante (`FLOAT`, `REAL`, `DOUBLE`) introduce errores de redondeo binario acumulativos (ej. `0.1 + 0.2 !== 0.3`). 

Asimismo, SevenPOS opera en países con distintas precisiones de unidad monetaria:
- **Chile (CLP)** y **Colombia (COP)**: Sin decimales operacionales (ej. \$12.990).
- **Estados Unidos (USD)** y **Venezuela (VES)**: 2 decimales fraccionarios (centavos/céntimos).

---

## 2. Decisión

1. **Almacenamiento Estricto en Enteros (`INTEGER`)**: Todos los precios de venta (`sale_price`), costos (`cost_price`) y futuros totales de venta se almacenarán en la base de datos SQLite como enteros en **minor units** (la unidad fraccionaria mínima indivisible de la divisa).
2. **Metadata Centralizada (`CurrencyDefinition`)**:
   - `CLP`: `minorUnitExponent = 0` (\$12.990 $\rightarrow$ `12990`)
   - `COP`: `minorUnitExponent = 0` (\$19.900 $\rightarrow$ `19900`)
   - `USD`: `minorUnitExponent = 2` (\$12.50 $\rightarrow$ `1250`)
   - `VES`: `minorUnitExponent = 2` (Bs. 12,50 $\rightarrow$ `1250`)
3. **Conversión Aislada en Capa de Dominio**: El módulo [`src/domain/common/money/Money.ts`](file:///c:/Users/Omar/Documents/SevenPOS/src/domain/common/money/Money.ts) centraliza las funciones `toMinorUnits`, `toMajorUnits`, `formatMoney` y `parseMoneyInput`. Ningún componente de UI realiza multiplicaciones o divisiones monetarias arbitrarias.

---

## 3. Consecuencias

- **Positivas**: Cero errores de redondeo en base de datos y cálculos, integridad financiera absoluta, queries SQLite de agregación (`SUM(sale_price)`) 100% exactas y compatibilidad futura con multidivisa.
- **Consideraciones**: Los inputs de usuario deben pasar por `parseMoneyInput` antes de persistirse y formatearse con `formatMoney` para la vista.
