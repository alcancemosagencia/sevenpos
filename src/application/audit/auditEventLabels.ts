export const EVENT_TYPE_LABELS: Record<string, string> = {
  // Auth & Security
  'auth.login.success': 'Acceso exitoso',
  'auth.pin.failed': 'Intento de acceso fallido',
  'auth.pin.locked': 'Acceso bloqueado temporalmente',
  'auth.logout': 'Cierre de sesión',
  'device.enrolled': 'Nuevo dispositivo configurado',

  // Sales
  'sale.completed': 'Venta completada',
  'sale.discount.applied': 'Descuento aplicado',

  // Cash & Sessions
  'cash.shift.opened': 'Caja abierta',
  'cash.shift.closed': 'Caja cerrada',
  'cash.discrepancy.detected': 'Diferencia al cerrar caja',
  'cash.movement.created': 'Movimiento de caja registrado',

  // Inventory
  'inventory.adjustment.created': 'Ajuste de inventario',
  'inventory.stock.sale_deduction': 'Stock actualizado por venta',
  'inventory.stock.purchase_entry': 'Stock actualizado por compra',

  // Catalog
  'product.created': 'Producto creado',
  'product.updated': 'Producto actualizado',
  'product.deactivated': 'Producto desactivado',
  'category.created': 'Categoría creada',
  'category.updated': 'Categoría actualizada',
  'category.deactivated': 'Categoría desactivada',

  // Purchases & Expenses
  'purchase.order.created': 'Orden de compra creada',
  'purchase.receipt.created': 'Mercadería recibida',
  'expense.created': 'Gasto registrado',

  // Customers
  'customer.created': 'Cliente registrado',
  'customer.updated': 'Cliente actualizado',

  // Settings & Configuration (Fixture supported)
  'settings.currency_updated': 'Tasa de cambio actualizada',
};

export const CATEGORY_LABELS: Record<string, string> = {
  AUTH: 'Seguridad y Acceso',
  DEVICE: 'Seguridad y Acceso',
  SALES: 'Ventas',
  CASH: 'Caja y Turnos',
  INVENTORY: 'Inventario',
  CATALOG: 'Catálogo',
  PURCHASES: 'Compras',
  EXPENSES: 'Gastos',
  CUSTOMERS: 'Clientes',
  SETTINGS: 'Configuración',
  SYSTEM: 'Sistema',
};

export const SEVERITY_LABELS: Record<string, string> = {
  INFO: 'Informativo',
  WARNING: 'Advertencia',
  CRITICAL: 'Crítico',
};

const DEFAULT_EVENT_LABEL = 'Actividad registrada';
const DEFAULT_CATEGORY_LABEL = 'General';
const DEFAULT_SEVERITY_LABEL = 'Informativo';

export function getHumanEventLabel(eventType: string): string {
  if (EVENT_TYPE_LABELS[eventType]) {
    return EVENT_TYPE_LABELS[eventType];
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.warn(`[AuditLabels] Unmapped eventType: "${eventType}". Using fallback "${DEFAULT_EVENT_LABEL}".`);
  }
  return DEFAULT_EVENT_LABEL;
}

export function getHumanCategoryLabel(category: string): string {
  if (CATEGORY_LABELS[category]) {
    return CATEGORY_LABELS[category];
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.warn(`[AuditLabels] Unmapped category: "${category}". Using fallback "${DEFAULT_CATEGORY_LABEL}".`);
  }
  return DEFAULT_CATEGORY_LABEL;
}

export function getHumanSeverityLabel(severity: string): string {
  if (SEVERITY_LABELS[severity]) {
    return SEVERITY_LABELS[severity];
  }
  return DEFAULT_SEVERITY_LABEL;
}

export interface FriendlyMetadataEntry {
  label: string;
  value: string;
}

export function formatFriendlyMetadata(jsonString?: string | null): FriendlyMetadataEntry[] {
  if (!jsonString) return [];
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') return [];

    const entries: FriendlyMetadataEntry[] = [];

    const keyLabels: Record<string, string> = {
      saleNumber: 'N° de Venta',
      total: 'Monto total',
      subtotal: 'Subtotal',
      discountTotal: 'Descuento aplicado',
      taxTotal: 'Impuestos',
      currencyCode: 'Moneda',
      customerNameSnapshot: 'Cliente',
      itemCount: 'Cantidad de productos',
      productName: 'Producto',
      quantityDelta: 'Cambio de unidades',
      reason: 'Motivo',
      initialCash: 'Fondo inicial de caja',
      finalCash: 'Monto final de caja',
      declaredCash: 'Efectivo declarado',
      calculatedCash: 'Efectivo esperado en sistema',
      discrepancy: 'Diferencia en arqueo',
      method: 'Método de ingreso',
      platform: 'Plataforma del terminal',
      attemptCount: 'N° de intento',
      maxAttempts: 'Intentos máximos permitidos',
      amount: 'Monto registrado',
      orderNumber: 'N° de orden de compra',
      supplierName: 'Proveedor',
      categoryName: 'Nombre de categoría',
      sku: 'Código / SKU',
      price: 'Precio de venta',
      cost: 'Costo unitario',
      previousRate: 'Tasa anterior',
      newRate: 'Nueva tasa',
      exchangeRate: 'Tasa de cambio',
      provider: 'Proveedor',
      businessName: 'Nombre del negocio',
      fiscalId: 'RUT / Identificador fiscal',
    };

    for (const [key, rawVal] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      const label = keyLabels[key] || key;
      let formattedVal = String(rawVal);

      if (typeof rawVal === 'number') {
        const kLow = key.toLowerCase();
        if (
          kLow.includes('total') ||
          kLow.includes('cash') ||
          kLow.includes('amount') ||
          kLow.includes('price') ||
          kLow.includes('cost') ||
          kLow.includes('discrepancy')
        ) {
          formattedVal = `$ ${rawVal.toLocaleString('es-CL')}`;
        } else {
          formattedVal = rawVal.toLocaleString('es-CL');
        }
      } else if (typeof rawVal === 'boolean') {
        formattedVal = rawVal ? 'Sí' : 'No';
      }

      entries.push({ label, value: formattedVal });
    }

    return entries;
  } catch {
    return [];
  }
}
