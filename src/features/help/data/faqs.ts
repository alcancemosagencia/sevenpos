import { FaqItem } from '../types';

export const HELP_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    categoryId: 'primeros-pasos',
    question: '¿Cómo funciona SevenPOS cuando se interrumpe la conexión a internet?',
    answer: 'En la aplicación de escritorio instalada, SevenPOS permite continuar realizando determinadas operaciones comerciales y de venta localmente en tu equipo. En la versión web de navegador, la operatividad depende de la conexión de red activa.',
  },
  {
    id: 'faq-2',
    categoryId: 'usuarios-permisos',
    question: '¿Cómo cambio de usuario o cajero rápidamente durante el turno?',
    answer: 'Haz click en la tarjeta de operador en la barra superior o selecciona "Cambiar operador". El nuevo usuario ingresa su PIN personal de seguridad para continuar atendiendo de inmediato sin reiniciar la pantalla.',
  },
  {
    id: 'faq-3',
    categoryId: 'usuarios-permisos',
    question: '¿Qué ocurre si un operador olvida su PIN de acceso?',
    answer: 'El usuario con rol Dueño puede restablecer o reasignar el PIN de cualquier operador desde Configuración > Usuarios y permisos. El Dueño puede recuperar su acceso mediante el correo electrónico registrado.',
  },
  {
    id: 'faq-4',
    categoryId: 'configuracion',
    question: '¿Cómo imprimo tickets en una impresora térmica?',
    answer: 'Conecta tu impresora térmica (58mm u 80mm) por USB. Al finalizar cada venta, presiona "Imprimir Comprobante" para emitir el ticket con los datos configurados de tu comercio.',
  },
  {
    id: 'faq-5',
    categoryId: 'configuracion',
    question: '¿Cómo protege SevenPOS la información de mi negocio?',
    answer: 'La información de ventas, catálogo y clientes se resguarda de forma segura en tu estación de trabajo. Además, puedes generar copias de respaldo descargables desde el menú de Configuración para resguardo externo.',
  },
  {
    id: 'faq-6',
    categoryId: 'primeros-pasos',
    question: '¿Cuál es la diferencia entre usar SevenPOS en el navegador y en la app de escritorio?',
    answer: 'La aplicación de escritorio ofrece mayor agilidad de respuesta y soporte directo para periféricos de mostrador. La versión web te permite acceder cómodamente desde cualquier navegador sin instalación previa.',
  },
  {
    id: 'faq-7',
    categoryId: 'caja-finanzas',
    question: '¿Cómo realizo un cierre de caja o arqueo diario?',
    answer: 'Ingresa a Finanzas > Caja y Turnos, realiza el conteo del efectivo en la gaveta y digita el monto en la pantalla de arqueo. SevenPOS contrastará el dinero real contra las ventas registradas y generará el informe de cierre.',
  },
  {
    id: 'faq-8',
    categoryId: 'clientes',
    question: '¿Cómo registro una venta fiada en cuenta corriente?',
    answer: 'En el Punto de Venta, asigna el cliente a la venta y presiona "Cobrar". Selecciona la opción "A crédito / Cuenta Corriente" siempre que no supere el límite de crédito configurado para ese cliente.',
  },
  {
    id: 'faq-9',
    categoryId: 'usuarios-permisos',
    question: '¿Qué permisos tiene cada perfil (Dueño, Administrador, Cajero)?',
    answer: 'El Dueño tiene acceso total a configuración, auditoría y usuarios. El Administrador gestiona productos, inventario, compras, reportes y ventas. El Cajero opera exclusivamente en el mostrador para cobros y consultas básicas.',
  },
  {
    id: 'faq-10',
    categoryId: 'configuracion',
    question: '¿Cómo descargo una copia de respaldo de mis datos?',
    answer: 'Ve a Configuración y presiona "Descargar copia de seguridad". Se generará un archivo con la información de tu negocio para guardarlo en una memoria USB o almacenamiento seguro.',
  },
  {
    id: 'faq-11',
    categoryId: 'punto-de-venta',
    question: '¿Cómo aplico un descuento durante una venta?',
    answer: 'En la pantalla de cobro del Punto de Venta, puedes aplicar una bonificación a un producto específico haciendo click sobre él, o utilizar el campo de descuento global al pie del carrito antes de cobrar.',
  },
  {
    id: 'faq-12',
    categoryId: 'punto-de-venta',
    question: '¿Qué atajos de teclado rápidos existen para el mostrador?',
    answer: 'Presiona F2 desde cualquier pantalla para ir directamente al Punto de Venta a cobrar. Usa Escape para cerrar diálogos o ventanas emergentes y Enter en el buscador para agregar productos rápidamente.',
  },
];
