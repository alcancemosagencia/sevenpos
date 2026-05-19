import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { saasPlans } from "@/features/billing/plans";

const dataDir = path.join(process.cwd(), ".sevenpos-admin");
const uploadsDir = path.join(process.cwd(), "public", "uploads", "admin");

export type AdminSettings = {
  branding: {
    logoUrl: string | null;
    commercialName: string;
    slogan: string;
  };
  smtp: {
    host: string;
    port: string;
    username: string;
    password: string;
    senderEmail: string;
    senderName: string;
  };
  superAdminEmails: string;
  trialDefaultDays: number;
  defaultCurrency: "USD" | "BS" | "CLP";
  maintenanceMode: boolean;
};

export type AdminPlan = {
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxBranches: number;
  trialAllowed: boolean;
  status: "ACTIVE" | "INACTIVE";
  modules: string[];
};

export type AdminPayment = {
  id: string;
  businessId: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  amount: number;
  currency: "USD" | "BS" | "CLP";
  method: string;
  reference: string;
  paidAt: string;
  nextDueAt: string;
  notes: string;
  operator: string;
};

export type AdminCurrency = {
  code: "USD" | "BS" | "CLP" | string;
  name: string;
  symbol: string;
  rate: number;
  rounding: string;
  active: boolean;
  default: boolean;
  country?: string;
  autoProvider?: "MANUAL" | "BCV";
};

const defaultSettings: AdminSettings = {
  branding: {
    logoUrl: null,
    commercialName: "SevenPOS",
    slogan: "Modern point of sale",
  },
  smtp: {
    host: "",
    port: "587",
    username: "",
    password: "",
    senderEmail: "",
    senderName: "SevenPOS",
  },
  superAdminEmails: "",
  trialDefaultDays: 30,
  defaultCurrency: "USD",
  maintenanceMode: false,
};

const defaultPlans: AdminPlan[] = Object.entries(saasPlans).map(([slug, plan]) => ({
  name: plan.label,
  slug: slug.toLowerCase(),
  monthlyPrice: plan.priceUsd,
  annualPrice: plan.annualPriceUsd,
  maxUsers: plan.userLimit,
  maxBranches: plan.branchLimit,
  trialAllowed: true,
  status: "ACTIVE",
  modules: [...plan.modules],
}));

const defaultCurrencies: AdminCurrency[] = [
  { code: "USD", name: "Dolar estadounidense", symbol: "$", rate: 1, rounding: "0.01", active: true, default: true, country: "Global", autoProvider: "MANUAL" },
  { code: "BS", name: "Bolivar", symbol: "Bs", rate: 122, rounding: "0.01", active: true, default: false, country: "Venezuela", autoProvider: "BCV" },
  { code: "CLP", name: "Peso chileno", symbol: "$", rate: 940, rounding: "1", active: false, default: false, country: "Chile", autoProvider: "MANUAL" },
];

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(path.join(dataDir, fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(fileName: string, value: T) {
  await ensureDataDir();
  await fs.writeFile(path.join(dataDir, fileName), JSON.stringify(value, null, 2));
}

export function getUploadsDir() {
  return uploadsDir;
}

export async function getAdminSettings() {
  return readJson<AdminSettings>("settings.json", defaultSettings);
}

export async function saveAdminSettings(settings: AdminSettings) {
  await writeJson("settings.json", settings);
}

export async function getAdminPlans() {
  return readJson<AdminPlan[]>("plans.json", defaultPlans);
}

export async function saveAdminPlans(plans: AdminPlan[]) {
  await writeJson("plans.json", plans);
}

export async function getAdminPayments() {
  return readJson<AdminPayment[]>("payments.json", []);
}

export async function saveAdminPayments(payments: AdminPayment[]) {
  await writeJson("payments.json", payments);
}

export async function getAdminCurrencies() {
  return readJson<AdminCurrency[]>("currencies.json", defaultCurrencies);
}

export async function saveAdminCurrencies(currencies: AdminCurrency[]) {
  await writeJson("currencies.json", currencies);
}
