export type BusinessType = "COMMERCE" | "RESTAURANT";

export const businessTypeFeatures: Record<BusinessType, string[]> = {
  COMMERCE: ["POS", "Preventa", "Transferencias", "Inventario", "Sitio web"],
  RESTAURANT: ["POS", "Mesas", "Menú público", "Delivery", "KDS", "Comandas"],
};

export function getBusinessTypeFeatures(type: BusinessType) {
  return businessTypeFeatures[type] ?? businessTypeFeatures.COMMERCE;
}
