import { HelpArticle } from '../types';

export const HELP_ARTICLES: HelpArticle[] = [
  // 1. PRIMEROS PASOS (3 artículos)
  {
    id: 'art-primeros-pasos-1',
    categoryId: 'primeros-pasos',
    title: 'Cómo iniciar tu primer día de ventas en SevenPOS',
    description: 'Guía práctica para abrir caja, verificar productos y realizar tu primera transacción en minutos.',
    readTimeMinutes: 3,
    tags: ['inicio', 'primeros pasos', 'caja', 'venta', 'nuevo'],
    isFeatured: true,
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir el turno de caja',
        content: 'Dirígete a Finanzas > Caja y Turnos e ingresa el monto inicial en efectivo con el que arranca tu mostrador.',
        tip: 'Contar el cambio inicial evita discrepancias al momento del arqueo final.',
      },
      {
        stepNumber: 2,
        title: 'Acceder al Punto de Venta',
        content: 'Presiona la tecla F2 o haz click en "Punto de Venta" en el menú lateral izquierdo.',
      },
      {
        stepNumber: 3,
        title: 'Buscar o escanear productos',
        content: 'Usa el lector de código de barras o escribe el nombre del artículo en el buscador superior.',
      },
      {
        stepNumber: 4,
        title: 'Cobrar y emitir comprobante',
        content: 'Presiona "Cobrar", selecciona el medio de pago (Efectivo, Tarjeta o Transferencia) e ingresa el importe abonado.',
        tip: 'El sistema calcula automáticamente el vuelto exacto a entregar.',
      },
    ],
    relatedArticleIds: ['art-pos-1', 'art-caj-1', 'art-cfg-3'],
  },
  {
    id: 'art-primeros-pasos-2',
    categoryId: 'primeros-pasos',
    title: 'Configuración inicial de tu negocio y datos comerciales',
    description: 'Aprende a establecer el nombre de fantasía, país, moneda y datos que aparecerán en los tickets.',
    readTimeMinutes: 2,
    tags: ['configuracion', 'negocio', 'empresa', 'moneda', 'datos'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ingresar a Configuración',
        content: 'Desde el menú lateral o el icono de engranaje superior, selecciona "Configuración".',
      },
      {
        stepNumber: 2,
        title: 'Completar información general',
        content: 'Ingresa el nombre comercial de tu negocio, dirección física, teléfono de contacto y correo electrónico del titular.',
      },
      {
        stepNumber: 3,
        title: 'Guardar cambios',
        content: 'Haz click en "Guardar cambios". Los nuevos datos se aplicarán inmediatamente en todos los comprobantes impresos.',
      },
    ],
    relatedArticleIds: ['art-cfg-1', 'art-cfg-2'],
  },
  {
    id: 'art-primeros-pasos-3',
    categoryId: 'primeros-pasos',
    title: 'Cargar tus primeros productos rápidamente',
    description: 'Método rápido para dar de alta artículos esenciales con nombre, precio, costo y existencias iniciales.',
    readTimeMinutes: 3,
    tags: ['productos', 'catalogo', 'stock', 'alta', 'crear'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ir al Catálogo de Productos',
        content: 'Navega a Catálogo > Productos y presiona el botón "Nuevo Producto".',
      },
      {
        stepNumber: 2,
        title: 'Ingresar código y nombre',
        content: 'Escanea el código de barras del producto o ingresa un código propio de identificación.',
      },
      {
        stepNumber: 3,
        title: 'Definir precio de venta y costo',
        content: 'Indica el precio al público y opcionalmente el costo de compra para calcular el margen comercial.',
        tip: 'Si no conoces el costo exacto, puedes completarlo más adelante sin pausar las ventas.',
      },
      {
        stepNumber: 4,
        title: 'Indicar stock inicial',
        content: 'Establece la cantidad de unidades disponibles en estantería para iniciar el seguimiento del inventario.',
      },
    ],
    relatedArticleIds: ['art-cat-1', 'art-inv-1'],
  },

  // 2. PUNTO DE VENTA (3 artículos)
  {
    id: 'art-pos-1',
    categoryId: 'punto-de-venta',
    title: 'Cómo realizar una venta paso a paso en el mostrador',
    description: 'Flujo completo de facturación en el mostrador: agregar productos, modificar cantidades y finalizar la operación.',
    readTimeMinutes: 3,
    tags: ['venta', 'caja', 'pos', 'cobro', 'ticket'],
    isFeatured: true,
    steps: [
      {
        stepNumber: 1,
        title: 'Ingresar al POS',
        content: 'Presiona F2 en cualquier momento para ir a la pantalla de venta.',
      },
      {
        stepNumber: 2,
        title: 'Agregar artículos al carrito',
        content: 'Escanea el código o busca por nombre. Puedes hacer click sucesivo en un producto o usar los botones + y - para ajustar la cantidad.',
      },
      {
        stepNumber: 3,
        title: 'Seleccionar cliente (opcional)',
        content: 'Si la venta es para un cliente habitual o fiada en cuenta corriente, selecciónalo en el buscador de clientes.',
      },
      {
        stepNumber: 4,
        title: 'Finalizar la venta',
        content: 'Haz click en "Cobrar", elige el método de pago e imprime el comprobante de venta.',
      },
    ],
    relatedArticleIds: ['art-pos-2', 'art-pos-3', 'art-vta-1'],
  },
  {
    id: 'art-pos-2',
    categoryId: 'punto-de-venta',
    title: 'Cobro con múltiples medios de pago (Efectivo, Tarjeta, Transferencia)',
    description: 'Aprende a registrar pagos combinados cuando el cliente abona una parte en efectivo y otra por billetera digital.',
    readTimeMinutes: 3,
    tags: ['pagos', 'efectivo', 'tarjeta', 'transferencia', 'mixto', 'dividido'],
    steps: [
      {
        stepNumber: 1,
        title: 'Iniciar el cobro',
        content: 'Con el carrito completo, haz click en "Cobrar".',
      },
      {
        stepNumber: 2,
        title: 'Elegir pago mixto',
        content: 'Selecciona la opción de pago mixto si el cliente abona con dos medios diferentes.',
      },
      {
        stepNumber: 3,
        title: 'Ingresar montos parciales',
        content: 'Ingresa la cantidad recibida en el primer método (ej. Efectivo) y el saldo restante se asignará al segundo método (ej. Tarjeta/QR).',
        tip: 'Verifica que la suma total coincida exactamente con el importe de la orden.',
      },
      {
        stepNumber: 4,
        title: 'Confirmar transacción',
        content: 'Presiona "Confirmar Venta" para asentar los movimientos en caja y descontar el stock.',
      },
    ],
    relatedArticleIds: ['art-pos-1', 'art-caj-1'],
  },
  {
    id: 'art-pos-3',
    categoryId: 'punto-de-venta',
    title: 'Aplicar descuentos y bonificaciones en el carrito',
    description: 'Cómo bonificar un porcentaje o importe fijo en un producto específico o en el total de la compra.',
    readTimeMinutes: 2,
    tags: ['descuento', 'promocion', 'bonificacion', 'precio', 'oferta'],
    steps: [
      {
        stepNumber: 1,
        title: 'Descuento por ítem',
        content: 'Haz click sobre la línea del producto en el carrito y escribe el porcentaje o monto a descontar.',
      },
      {
        stepNumber: 2,
        title: 'Descuento global',
        content: 'Usa el campo de descuento general situado al pie del carrito antes de presionar Cobrar.',
        tip: 'Los descuentos requieren permisos de Administrador o Dueño si están restringidos para cajeros.',
      },
    ],
    relatedArticleIds: ['art-pos-1', 'art-usr-1'],
  },

  // 3. VENTAS (2 artículos)
  {
    id: 'art-vta-1',
    categoryId: 'ventas',
    title: 'Consultar el historial de ventas y reimprimir comprobantes',
    description: 'Localiza transacciones pasadas por número de ticket, fecha o cliente y vuelve a imprimir el comprobante.',
    readTimeMinutes: 2,
    tags: ['historial ventas', 'reimprimir', 'tickets', 'consultas', 'comprobante'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acceder a Ventas',
        content: 'Navega a la sección Ventas en el menú lateral principal.',
      },
      {
        stepNumber: 2,
        title: 'Filtrar operaciones',
        content: 'Usa el selector de fechas y el buscador para encontrar la venta deseada.',
      },
      {
        stepNumber: 3,
        title: 'Ver detalle y reimprimir',
        content: 'Haz click en la venta para abrir el resumen completo y presiona "Reimprimir ticket".',
      },
    ],
    relatedArticleIds: ['art-vta-2', 'art-pos-1'],
  },
  {
    id: 'art-vta-2',
    categoryId: 'ventas',
    title: 'Anulaciones y devoluciones de ventas registradas',
    description: 'Procedimiento seguro para cancelar una transacción errónea y reintegrar los productos al inventario.',
    readTimeMinutes: 3,
    tags: ['anular', 'devolucion', 'cancelar', 'reintegro', 'nota de credito'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ubicar la venta',
        content: 'En la sección Ventas, localiza el comprobante que necesitas anular.',
      },
      {
        stepNumber: 2,
        title: 'Solicitar anulación',
        content: 'Presiona "Anular Venta" e ingresa el motivo de la cancelación.',
        tip: 'Esta acción requiere autorización de Dueño o Administrador y queda registrada en la bitácora de auditoría.',
      },
      {
        stepNumber: 3,
        title: 'Actualización automática',
        content: 'El importe se descuenta de los totales del turno y las unidades vuelven a estar disponibles en stock.',
      },
    ],
    relatedArticleIds: ['art-vta-1', 'art-aud-1'],
  },

  // 4. CATÁLOGO (2 artículos)
  {
    id: 'art-cat-1',
    categoryId: 'catalogo',
    title: 'Crear y editar productos con código de barras',
    description: 'Guía para registrar artículos detallando código de barras, categoría, unidad de medida, costo y precio.',
    readTimeMinutes: 3,
    tags: ['producto', 'codigo de barras', 'crear', 'catalogo', 'precio'],
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir formulario de nuevo producto',
        content: 'Ve a Catálogo > Productos y haz click en "Nuevo Producto".',
      },
      {
        stepNumber: 2,
        title: 'Completar datos principales',
        content: 'Escribe el nombre del producto, selecciona la categoría y escanea el código de barras.',
      },
      {
        stepNumber: 3,
        title: 'Definir precios y costos',
        content: 'Establece el precio de venta y el costo base de adquisición.',
      },
      {
        stepNumber: 4,
        title: 'Guardar producto',
        content: 'Presiona "Guardar". El artículo estará disponible al instante para la venta en el mostrador.',
      },
    ],
    relatedArticleIds: ['art-cat-2', 'art-inv-1'],
  },
  {
    id: 'art-cat-2',
    categoryId: 'catalogo',
    title: 'Organizar tus productos por categorías y familias',
    description: 'Estructura tus artículos en categorías para encontrarlos más rápido en el mostrador y filtrar reportes.',
    readTimeMinutes: 2,
    tags: ['categorias', 'catalogo', 'familias', 'organizacion', 'filtro'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ir a Categorías',
        content: 'Accede a Catálogo > Categorías y haz click en "Nueva Categoría".',
      },
      {
        stepNumber: 2,
        title: 'Asignar nombre y color',
        content: 'Ingresa un nombre claro (ej. Bebidas, Almacén, Limpieza) y asigna un color distintivo.',
      },
      {
        stepNumber: 3,
        title: 'Vincular productos',
        content: 'Al crear o editar productos, selecciona la categoría para agruparlos visualmente.',
      },
    ],
    relatedArticleIds: ['art-cat-1', 'art-primeros-pasos-3'],
  },

  // 5. INVENTARIO (2 artículos)
  {
    id: 'art-inv-1',
    categoryId: 'inventario',
    title: 'Control de existencias y alertas de stock mínimo',
    description: 'Configura umbrales de advertencia para saber cuándo pedir mercadería a tus proveedores antes de que se agote.',
    readTimeMinutes: 2,
    tags: ['stock minimo', 'alerta', 'reposicion', 'agotado', 'existencias'],
    steps: [
      {
        stepNumber: 1,
        title: 'Definir stock mínimo en el producto',
        content: 'Edita el producto y completa el campo "Stock Mínimo" con la cantidad de seguridad deseada.',
      },
      {
        stepNumber: 2,
        title: 'Monitorear existencias críticas',
        content: 'En la sección Inventario > Existencias, filtra por "Stock Bajo" para ver los artículos que requieren compra inmediata.',
      },
    ],
    relatedArticleIds: ['art-inv-2', 'art-cmp-1'],
  },
  {
    id: 'art-inv-2',
    categoryId: 'inventario',
    title: 'Ajustes de inventario por rotura, vencimiento o conteo físico',
    description: 'Cómo registrar entradas o salidas manuales de mercadería con justificación y registro de auditoría.',
    readTimeMinutes: 3,
    tags: ['ajuste', 'inventario', 'stock', 'merma', 'rotura', 'perdida'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acceder a Movimientos de Inventario',
        content: 'Dirígete a Inventario > Movimientos y selecciona "Nuevo Ajuste".',
      },
      {
        stepNumber: 2,
        title: 'Elegir producto y tipo de movimiento',
        content: 'Selecciona el artículo y define si es una Entrada (positivo) o Salida (negativo).',
      },
      {
        stepNumber: 3,
        title: 'Indicar motivo',
        content: 'Elige la razón del ajuste (Conteo físico, Mercadería dañada, Vencimiento o Uso interno).',
        tip: 'Todos los ajustes quedan guardados con la firma del operador que realizó el movimiento.',
      },
      {
        stepNumber: 4,
        title: 'Confirmar ajuste',
        content: 'Haz click en "Aplicar Ajuste" para actualizar las existencias en tiempo real.',
      },
    ],
    relatedArticleIds: ['art-inv-1', 'art-aud-1'],
  },

  // 6. COMPRAS (2 artículos)
  {
    id: 'art-cmp-1',
    categoryId: 'compras',
    title: 'Registrar una compra a proveedores y actualizar stock',
    description: 'Ingreso de facturas o remitos de mercadería recibida para aumentar el inventario y actualizar costos.',
    readTimeMinutes: 3,
    tags: ['compras', 'proveedores', 'ingreso stock', 'facturas', 'costos'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ir a Compras',
        content: 'Navega a Compras en el menú lateral y haz click en "Nueva Compra".',
      },
      {
        stepNumber: 2,
        title: 'Seleccionar proveedor',
        content: 'Elige el proveedor habitual o da de alta uno nuevo en el momento.',
      },
      {
        stepNumber: 3,
        title: 'Cargar artículos y costos',
        content: 'Agrega los productos recibidos con su cantidad y precio de compra pactado.',
      },
      {
        stepNumber: 4,
        title: 'Confirmar recepción',
        content: 'Al guardar la compra, el stock de cada producto se incrementará automáticamente.',
      },
    ],
    relatedArticleIds: ['art-cmp-2', 'art-inv-1'],
  },
  {
    id: 'art-cmp-2',
    categoryId: 'compras',
    title: 'Administrar el listado de proveedores habituales',
    description: 'Registro de contactos de distribuidores, condiciones comerciales y seguimiento de pedidos.',
    readTimeMinutes: 2,
    tags: ['proveedores', 'contacto', 'distribuidores', 'compras'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acceder a Proveedores',
        content: 'En el módulo de Compras, selecciona la pestaña de Proveedores.',
      },
      {
        stepNumber: 2,
        title: 'Crear ficha de proveedor',
        content: 'Ingresa el nombre de la empresa, teléfono de contacto y dirección.',
      },
      {
        stepNumber: 3,
        title: 'Guardar información',
        content: 'Presiona "Guardar Proveedor" para tenerlo disponible al cargar nuevos pedidos.',
      },
    ],
    relatedArticleIds: ['art-cmp-1', 'art-inv-1'],
  },

  // 7. CAJA Y FINANZAS (2 artículos)
  {
    id: 'art-caj-1',
    categoryId: 'caja-finanzas',
    title: 'Apertura, arqueo y cierre de caja diario',
    description: 'Procedimiento para registrar el dinero en caja, comparar ingresos reales contra sistema y cerrar el turno.',
    readTimeMinutes: 4,
    tags: ['cierre de caja', 'arqueo', 'turno', 'finanzas', 'efectivo'],
    isFeatured: true,
    steps: [
      {
        stepNumber: 1,
        title: 'Ver resumen del turno',
        content: 'Ingresa a Finanzas > Caja y Turnos para consultar las ventas acumuladas por medio de pago.',
      },
      {
        stepNumber: 2,
        title: 'Contar el dinero físico en gaveta',
        content: 'Realiza el recuento ciego de billetes y monedas presentes en la caja física.',
      },
      {
        stepNumber: 3,
        title: 'Ingresar arqueo final',
        content: 'Escribe el importe contado en el formulario de cierre. El sistema indicará si existe sobrante o faltante.',
      },
      {
        stepNumber: 4,
        title: 'Cerrar turno',
        content: 'Haz click en "Cerrar Turno" para emitir el reporte resumen de caja.',
        tip: 'El reporte de cierre queda auditado y guardado para consulta histórica.',
      },
    ],
    relatedArticleIds: ['art-caj-2', 'art-rep-1'],
  },
  {
    id: 'art-caj-2',
    categoryId: 'caja-finanzas',
    title: 'Registro de ingresos y egresos varios de caja',
    description: 'Cómo asentar retiros de dinero para gastos menores, pagos a proveedores o aportes de cambio.',
    readTimeMinutes: 2,
    tags: ['gastos', 'egresos', 'retiro efectivo', 'caja chica', 'movimientos'],
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir movimiento de caja',
        content: 'En Finanzas > Caja y Turnos, presiona "Registrar Movimiento".',
      },
      {
        stepNumber: 2,
        title: 'Seleccionar tipo',
        content: 'Elige si es un Ingreso (ej. aporte de cambio) o Egreso (ej. pago de flete o limpieza).',
      },
      {
        stepNumber: 3,
        title: 'Indicar monto y concepto',
        content: 'Ingresa la cantidad retirada y una breve descripción explicativa.',
      },
    ],
    relatedArticleIds: ['art-caj-1', 'art-rep-1'],
  },

  // 8. CLIENTES (3 artículos)
  {
    id: 'art-cli-1',
    categoryId: 'clientes',
    title: 'Registrar un nuevo cliente y habilitar cuenta corriente',
    description: 'Cómo dar de alta fichas de clientes con datos de contacto, identificación y tope de endeudamiento para fiado.',
    readTimeMinutes: 3,
    tags: ['clientes', 'credito', 'alta', 'deuda', 'limite'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ingresar a Clientes',
        content: 'Navega a la sección Clientes en el menú lateral y presiona "Nuevo Cliente".',
      },
      {
        stepNumber: 2,
        title: 'Completar datos de contacto',
        content: 'Ingresa Nombre, Apellido, Teléfono, Dirección y Documento/Identificación.',
      },
      {
        stepNumber: 3,
        title: 'Establecer límite de crédito',
        content: 'Define el monto máximo que el cliente puede tener acumulado en cuenta corriente.',
        tip: 'Si dejas el límite en 0, el cliente solo podrá comprar de contado.',
      },
      {
        stepNumber: 4,
        title: 'Guardar ficha',
        content: 'Presiona "Guardar Cliente".',
      },
    ],
    relatedArticleIds: ['art-cli-2', 'art-cli-3'],
  },
  {
    id: 'art-cli-2',
    categoryId: 'clientes',
    title: 'Ventas fiadas en Cuenta Corriente y cobranza de deudas',
    description: 'Flujo para vender a crédito, registrar pagos parciales o totales de deuda y emitir recibos de pago.',
    readTimeMinutes: 3,
    tags: ['fiado', 'cuenta corriente', 'cobranza', 'saldo', 'recibo'],
    isFeatured: true,
    steps: [
      {
        stepNumber: 1,
        title: 'Asignar cliente al carrito',
        content: 'En el Punto de Venta, selecciona al cliente antes de cobrar.',
      },
      {
        stepNumber: 2,
        title: 'Seleccionar método Cuenta Corriente',
        content: 'Al presionar Cobrar, elige "A crédito / Cuenta Corriente". El saldo deudor del cliente aumentará automáticamente.',
      },
      {
        stepNumber: 3,
        title: 'Cobrar abono o cancelación',
        content: 'Para registrar un pago de deuda, ve a Clientes, entra a la ficha del cliente y presiona "Registrar Cobro".',
      },
      {
        stepNumber: 4,
        title: 'Ingresar medio de pago del abono',
        content: 'Ingresa el monto que el cliente abona y el medio de pago recibido (Efectivo, Transferencia).',
      },
    ],
    relatedArticleIds: ['art-cli-1', 'art-cli-3'],
  },
  {
    id: 'art-cli-3',
    categoryId: 'clientes',
    title: 'Consultar el historial de compras y estado de cuenta de un cliente',
    description: 'Visualiza todas las compras, comprobantes, pagos y saldo pendiente acumulado de cada comprador.',
    readTimeMinutes: 2,
    tags: ['historial', 'estado de cuenta', 'extracto', 'compras', 'cliente'],
    steps: [
      {
        stepNumber: 1,
        title: 'Buscar cliente',
        content: 'En la pantalla Clientes, usa el buscador para ubicar al cliente por nombre o teléfono.',
      },
      {
        stepNumber: 2,
        title: 'Abrir detalle de cuenta',
        content: 'Haz click en el cliente para ver su saldo actual, límite disponible y la cronología completa de operaciones.',
      },
    ],
    relatedArticleIds: ['art-cli-1', 'art-cli-2'],
  },

  // 9. REPORTES E INTELIGENCIA (3 artículos)
  {
    id: 'art-rep-1',
    categoryId: 'reportes',
    title: 'Interpretar el panel de métricas y ventas diarias',
    description: 'Comprende los indicadores clave: facturación bruta, ganancia estimada, ticket promedio y cantidad de ventas.',
    readTimeMinutes: 3,
    tags: ['reportes', 'metricas', 'kpi', 'ventas', 'ganancia', 'dashboard'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acceder a Reportes',
        content: 'Navega a Reportes desde el menú principal.',
      },
      {
        stepNumber: 2,
        title: 'Seleccionar período',
        content: 'Filtra por Hoy, Ayer, Últimos 7 días, Este Mes o define un rango personalizado usando el selector.',
      },
      {
        stepNumber: 3,
        title: 'Analizar indicadores',
        content: 'Revisa las tarjetas de Facturación Total, Cantidad de Tickets y Margen Comercial.',
      },
    ],
    relatedArticleIds: ['art-rep-2', 'art-rep-3'],
  },
  {
    id: 'art-rep-2',
    categoryId: 'reportes',
    title: 'Analizar los productos más vendidos y márgenes de ganancia',
    description: 'Identifica cuáles son tus productos estrella y cuáles generan el mayor beneficio neto para tu negocio.',
    readTimeMinutes: 3,
    tags: ['top productos', 'mas vendidos', 'margen', 'rentabilidad'],
    steps: [
      {
        stepNumber: 1,
        title: 'Consultar ranking de productos',
        content: 'En el módulo de Reportes o en el Panel Principal, observa la tabla de productos más vendidos.',
      },
      {
        stepNumber: 2,
        title: 'Evaluar margen vs volumen',
        content: 'Compara la cantidad de unidades despachadas contra la ganancia bruta generada.',
      },
    ],
    relatedArticleIds: ['art-rep-1', 'art-cat-1'],
  },
  {
    id: 'art-rep-3',
    categoryId: 'reportes',
    title: 'Exportar reportes de ventas y cierres a formato CSV',
    description: 'Descarga listados de transacciones y cierres de caja para enviar a tu contador o archivar contablemente.',
    readTimeMinutes: 2,
    tags: ['exportar', 'excel', 'csv', 'contabilidad', 'reporte'],
    steps: [
      {
        stepNumber: 1,
        title: 'Filtrar el listado deseado',
        content: 'En Ventas o Reportes, selecciona el rango de fechas que deseas exportar.',
      },
      {
        stepNumber: 2,
        title: 'Presionar Exportar',
        content: 'Haz click en el botón "Exportar" en la esquina superior derecha para generar el archivo CSV con los datos.',
        tip: 'La exportación requiere permisos de Propietario o Administrador.',
      },
    ],
    relatedArticleIds: ['art-rep-1', 'art-usr-1'],
  },

  // 10. AUDITORÍA (2 artículos)
  {
    id: 'art-aud-1',
    categoryId: 'auditoria',
    title: 'Trazabilidad y registro de eventos operativos de seguridad',
    description: 'Conoce cómo SevenPOS documenta cada apertura de caja, cambio de precio, anulación y venta con su operador.',
    readTimeMinutes: 3,
    tags: ['auditoria', 'seguridad', 'trazabilidad', 'eventos', 'control'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ingresar a Auditoría',
        content: 'Navega a la sección Auditoría en el menú lateral.',
      },
      {
        stepNumber: 2,
        title: 'Consultar eventos registrados',
        content: 'Visualiza la lista cronológica con fecha, hora exacta, tipo de evento y operador responsable.',
      },
      {
        stepNumber: 3,
        title: 'Identificar acciones críticas',
        content: 'Los eventos de seguridad y advertencias se destacan con códigos de color para rápida identificación.',
      },
    ],
    relatedArticleIds: ['art-aud-2', 'art-usr-1'],
  },
  {
    id: 'art-aud-2',
    categoryId: 'auditoria',
    title: 'Filtros de auditoría por operador, categoría y fecha',
    description: 'Aprende a buscar rápidamente acciones específicas en la bitácora para resolver dudas operativas.',
    readTimeMinutes: 2,
    tags: ['filtros auditoria', 'buscar eventos', 'seguridad', 'operadores'],
    steps: [
      {
        stepNumber: 1,
        title: 'Aplicar filtros de búsqueda',
        content: 'En la barra superior de Auditoría, filtra por categoría (Ventas, Caja, Inventario, Seguridad).',
      },
      {
        stepNumber: 2,
        title: 'Seleccionar rango temporal',
        content: 'Usa el selector de fecha para acotar la búsqueda al turno o día de interés.',
      },
      {
        stepNumber: 3,
        title: 'Exportar historial',
        content: 'Descarga los eventos filtrados en formato CSV para documentación.',
      },
    ],
    relatedArticleIds: ['art-aud-1', 'art-rep-3'],
  },

  // 11. CONFIGURACIÓN (3 artículos)
  {
    id: 'art-cfg-1',
    categoryId: 'configuracion',
    title: 'Personalizar el nombre del negocio, país y moneda principal',
    description: 'Ajusta la denominación de tu comercio, símbolo de divisa y formato de visualización de precios.',
    readTimeMinutes: 2,
    tags: ['configuracion', 'moneda', 'negocio', 'divisa', 'ajustes'],
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir Configuración General',
        content: 'Ve a Configuración > General.',
      },
      {
        stepNumber: 2,
        title: 'Modificar moneda y país',
        content: 'Selecciona el país de operación para adoptar automáticamente el símbolo monetario correspondiente.',
      },
      {
        stepNumber: 3,
        title: 'Guardar cambios',
        content: 'Presiona "Guardar".',
      },
    ],
    relatedArticleIds: ['art-primeros-pasos-2', 'art-cfg-2'],
  },
  {
    id: 'art-cfg-2',
    categoryId: 'configuracion',
    title: 'Configurar datos del comprobante y pie de ticket',
    description: 'Agrega un mensaje de agradecimiento, redes sociales, teléfono y políticas de cambio en el ticket impreso.',
    readTimeMinutes: 2,
    tags: ['ticket', 'comprobante', 'pie de pagina', 'impresion', 'mensaje'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ir a Configuración de Tickets',
        content: 'En la sección Configuración, ubica el apartado de Comprobantes e Impresión.',
      },
      {
        stepNumber: 2,
        title: 'Escribir texto personalizado',
        content: 'Ingresa el encabezado y pie de página deseados para tus clientes.',
      },
      {
        stepNumber: 3,
        title: 'Guardar preferencias',
        content: 'Guarda los cambios y realiza una prueba de impresión.',
      },
    ],
    relatedArticleIds: ['art-cfg-1', 'art-cfg-3'],
  },
  {
    id: 'art-cfg-3',
    categoryId: 'configuracion',
    title: 'Configuración de lectores de código de barras e impresoras térmicas',
    description: 'Conexión y calibración de lectores ópticos USB/Bluetooth e impresoras de tickets de 58mm u 80mm.',
    readTimeMinutes: 3,
    tags: ['lector', 'impresora', 'termica', 'scanner', 'hardware', 'usb'],
    steps: [
      {
        stepNumber: 1,
        title: 'Conectar el lector por USB',
        content: 'Los lectores estándar funcionan en modo teclado; conéctalo a tu equipo para escanear productos en el POS.',
      },
      {
        stepNumber: 2,
        title: 'Conectar impresora térmica',
        content: 'Conecta la impresora por USB y selecciona el ancho de papel adecuado (58mm u 80mm).',
      },
      {
        stepNumber: 3,
        title: 'Probar emisión',
        content: 'Realiza una venta de prueba en el Punto de Venta para verificar la nitidez y alineación del ticket.',
      },
    ],
    relatedArticleIds: ['art-pos-1', 'art-cfg-2'],
  },

  // 12. USUARIOS Y PERMISOS (2 artículos)
  {
    id: 'art-usr-1',
    categoryId: 'usuarios-permisos',
    title: 'Perfiles de operador: Dueño, Administrador y Cajero',
    description: 'Conoce a qué módulos y acciones tiene acceso cada perfil de operador en el sistema.',
    readTimeMinutes: 3,
    tags: ['usuarios', 'roles', 'permisos', 'seguridad', 'dueño', 'cajero', 'admin'],
    isFeatured: true,
    steps: [
      {
        stepNumber: 1,
        title: 'Perfil Dueño (Owner)',
        content: 'Acceso total sin restricciones: gestión de usuarios, roles, auditoría, configuración comercial, eliminación de registros y copias de seguridad.',
      },
      {
        stepNumber: 2,
        title: 'Perfil Administrador (Admin)',
        content: 'Gestión operativa: catálogo, inventario, compras, proveedores, clientes, reportes y ventas. No puede alterar usuarios ni la auditoría del dueño.',
      },
      {
        stepNumber: 3,
        title: 'Perfil Cajero (Cashier)',
        content: 'Enfocado exclusivamente en el mostrador: vender en POS, consultar historial básico y registrar cobros. Bloqueado de reportes gerenciales, auditoría y configuración.',
      },
    ],
    relatedArticleIds: ['art-usr-2', 'art-aud-1'],
  },
  {
    id: 'art-usr-2',
    categoryId: 'usuarios-permisos',
    title: 'Crear operadores, asignar PIN y cambio rápido de turno',
    description: 'Cómo registrar cajeros o encargados con su propio código PIN de 4 a 6 dígitos y rotar de turno en segundos.',
    readTimeMinutes: 3,
    tags: ['crear usuario', 'cajero', 'pin', 'operador', 'fast switch', 'cambio usuario'],
    steps: [
      {
        stepNumber: 1,
        title: 'Ir a Configuración > Usuarios y permisos',
        content: 'Accede como Dueño a Configuración y presiona en "Usuarios y permisos".',
      },
      {
        stepNumber: 2,
        title: 'Presionar "Crear usuario"',
        content: 'Ingresa nombre, apellido, rol asignado y el PIN numérico personal de acceso.',
        tip: 'El PIN debe ser confidencial para cada empleado; todas las ventas quedarán atribuidas a su nombre.',
      },
      {
        stepNumber: 3,
        title: 'Cambio rápido de operador',
        content: 'Durante la jornada, haz click en la tarjeta de usuario en la barra superior e ingresa el PIN para cambiar de cajero.',
      },
    ],
    relatedArticleIds: ['art-usr-1', 'art-pos-1'],
  },

  // 13. SUSCRIPCIÓN Y PLANES (1 artículo)
  {
    id: 'art-sus-1',
    categoryId: 'suscripcion-planes',
    title: 'Uso de SevenPOS y próximas novedades del plan Pro',
    description: 'Conoce el alcance del plan actual de SevenPOS y las próximas funcionalidades avanzadas en desarrollo.',
    readTimeMinutes: 2,
    tags: ['plan', 'gratis', 'pro', 'suscripcion', 'novedades'],
    steps: [
      {
        stepNumber: 1,
        title: 'Plan actual disponible',
        content: 'SevenPOS incluye acceso completo al Punto de Venta, Catálogo, Inventario, Clientes, Compras, Caja y resumen del negocio.',
      },
      {
        stepNumber: 2,
        title: 'Evolución y plan Pro',
        content: 'Próximamente se incorporarán funciones avanzadas pensadas para comercios en expansión y gestión multi-sucursal.',
      },
      {
        stepNumber: 3,
        title: 'Actualizaciones periódicas',
        content: 'El sistema recibe mejoras continuas para garantizar máxima velocidad, estabilidad y seguridad en tu mostrador.',
      },
    ],
    relatedArticleIds: ['art-primeros-pasos-1', 'art-cfg-1'],
  },
];
