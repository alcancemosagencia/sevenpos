# SevenPOS POS Domain Specification (AG-06)

## 1. Responsabilidades del Punto de Venta (POS)
El POS es el workspace operacional primario de SevenPOS donde el cajero o dueño realiza las transacciones comerciales diarias.
Funciona 100% offline sobre SQLite local.

## 2. Invariantes del Carrito (`CartContext`)
- **Aislamiento de Sesión y Negocio**: La clave de almacenamiento efímero está versionada y aislada por negocio y usuario: `sevenpos_cart:${businessId}:${userId}` (`schemaVersion: 1`).
- **Limpieza en Logout**: Al cerrar la sesión, el storage efímero se purga automáticamente para evitar fugas de información entre operadores.
- **Escalado de Cantidades**: Las cantidades se manipulan en enteros escalados con `QUANTITY_SCALE = 1000`.
- **Aritmética Financiera Entera**: El cálculo del total bruto por línea utiliza `calculateGrossLineTotal(quantityScaled, unitPriceMinor)` con redondeo `HALF_UP` en enteros menores, evitando operaciones flotantes.
- **Distribución de Descuento Global**: Aplica el método *Largest Remainder Method* (Hare-Niemeyer) para garantizar que $\sum \text{line\_discount} \equiv \text{global\_discount}$ con cero discrepancia.
- **Revalidación de Catálogo (Price at Checkout)**: Al momento de confirmar la venta, el motor valida los precios vigentes. Si difieren del carrito, se retorna `PRICE_CHANGED` y se informa al usuario mediante el modal explicativo sin completar cobros silenciosos.

## 3. Escáner de Código de Barras (`usePosScanner`)
- Captura pasiva mediante emulador de teclado (Keyboard Wedge).
- Emparejamiento exacto con código de barras o SKU de productos base o presentaciones.
- Feedback audible/visual y prevención de sobreescritura de campos de texto activos.
