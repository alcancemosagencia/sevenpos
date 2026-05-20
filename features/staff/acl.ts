export const aclSections = [
  "POS",
  "Preventa",
  "Productos",
  "Inventario",
  "Transferencias",
  "Clientes",
  "Ventas",
  "Gastos",
  "Reportes",
  "Tienda Online",
  "Ticket",
  "Sucursales",
  "Configuración",
] as const;

export const aclActions = ["Ver", "Crear", "Editar", "Eliminar", "Cobrar", "Exportar", "Configurar"] as const;

export type AclSection = (typeof aclSections)[number];
export type AclAction = (typeof aclActions)[number];
