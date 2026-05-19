export const saasPlans = {
  STARTER: {
    label: "Starter",
    priceUsd: 19,
    annualPriceUsd: 190,
    branchLimit: 1,
    userLimit: 3,
    modules: ["POS", "Inventario", "Tickets"],
    features: ["POS", "inventario", "ventas", "tickets", "menú público", "sitio web"],
  },
  BUSINESS: {
    label: "Business",
    priceUsd: 49,
    annualPriceUsd: 490,
    branchLimit: 3,
    userLimit: 10,
    modules: ["POS", "Inventario", "CRM", "WhatsApp", "Reportes"],
    features: [
      "POS",
      "inventario",
      "ventas",
      "tickets",
      "menú público",
      "sitio web",
      "reportes",
      "CRM",
      "usuarios",
      "roles",
      "caja avanzada",
      "preventa móvil",
      "exportaciones",
      "soporte prioritario",
    ],
  },
  PREMIUM: {
    label: "Premium",
    priceUsd: 99,
    annualPriceUsd: 990,
    branchLimit: 10,
    userLimit: 30,
    modules: ["POS", "Inventario", "Delivery", "KDS", "Marketing", "CRM", "WhatsApp", "IA", "API", "Multi-sucursal"],
    features: [
      "POS",
      "inventario",
      "ventas",
      "tickets",
      "menú público",
      "sitio web",
      "reportes",
      "analytics avanzados",
      "auditoría",
      "exportaciones",
      "CRM",
      "usuarios",
      "roles",
      "delivery",
      "KDS",
      "marketing",
      "campañas",
      "IA",
      "API",
      "WhatsApp",
      "multi-sucursal",
      "preventa móvil",
      "inventario distribuido",
      "caja avanzada",
      "transferencias",
      "customer display",
      "multi printer",
      "hardware advanced",
      "tracking pedidos",
      "soporte prioritario",
    ],
  },
} as const;

export type CommercialPlan = keyof typeof saasPlans;

export function normalizeCommercialPlan(plan: string): CommercialPlan {
  if (plan === "PREMIUM" || plan === "PRO") return "PREMIUM";
  if (plan === "BUSINESS" || plan === "BASIC") return "BUSINESS";

  return "STARTER";
}

export function planPriceUsd(plan: string) {
  return saasPlans[normalizeCommercialPlan(plan)].priceUsd;
}
