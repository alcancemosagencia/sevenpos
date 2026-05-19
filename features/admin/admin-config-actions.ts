"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import type { BillingPaymentMethod, BusinessPlan } from "@prisma/client";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { uniqueSlug } from "@/lib/slug";
import {
  getAdminPayments,
  getAdminCurrencies,
  getAdminSettings,
  getUploadsDir,
  saveAdminPayments,
  saveAdminCurrencies,
  saveAdminSettings,
  type AdminCurrency,
  type AdminPayment,
} from "@/features/admin/admin-store";
import { moduleKeys } from "@/features/admin/admin-modules";
import { ensureBasePlans, getPlanById } from "@/features/billing/plan-service";
import { normalizeCommercialPlan } from "@/features/billing/plans";

async function requireAdmin() {
  const tenant = await requireTenantContext();
  if (!can(tenant.currentUser.role, "admin:access")) throw new Error("No autorizado.");
  return tenant;
}

function readText(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function readNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export async function saveAdminSettingsAction(formData: FormData) {
  await requireAdmin();
  const current = await getAdminSettings();
  const logo = formData.get("logo");
  let logoUrl = current.branding.logoUrl;

  if (logo instanceof File && logo.size > 0) {
    const extension = path.extname(logo.name) || ".png";
    await fs.mkdir(getUploadsDir(), { recursive: true });
    const fileName = `logo-${Date.now()}${extension.toLowerCase()}`;
    await fs.writeFile(path.join(getUploadsDir(), fileName), Buffer.from(await logo.arrayBuffer()));
    logoUrl = `/uploads/admin/${fileName}`;
  }

  await saveAdminSettings({
    branding: {
      logoUrl,
      commercialName: readText(formData, "commercialName", current.branding.commercialName),
      slogan: readText(formData, "slogan", current.branding.slogan),
    },
    smtp: {
      host: readText(formData, "smtpHost", current.smtp.host),
      port: readText(formData, "smtpPort", current.smtp.port),
      username: readText(formData, "smtpUsername", current.smtp.username),
      password: readText(formData, "smtpPassword", current.smtp.password),
      senderEmail: readText(formData, "smtpSenderEmail", current.smtp.senderEmail),
      senderName: readText(formData, "smtpSenderName", current.smtp.senderName),
    },
    superAdminEmails: readText(formData, "superAdminEmails", current.superAdminEmails),
    trialDefaultDays: readNumber(formData, "trialDefaultDays", current.trialDefaultDays),
    defaultCurrency: readText(formData, "defaultCurrency", current.defaultCurrency) as "USD" | "BS" | "CLP",
    maintenanceMode: formData.get("maintenanceMode") === "on",
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
}

export async function savePlanAction(formData: FormData) {
  await requireAdmin();
  await ensureBasePlans();
  const id = readText(formData, "planId");
  const slug = readText(formData, "slug").toLowerCase();
  const data = {
    name: readText(formData, "name"),
    slug,
    priceMonthly: readNumber(formData, "monthlyPrice"),
    priceYearly: readNumber(formData, "annualPrice"),
    maxUsers: readNumber(formData, "maxUsers"),
    maxBranches: readNumber(formData, "maxBranches"),
    trialAllowed: formData.get("trialAllowed") === "on",
    status: formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    features: moduleKeys.filter((module) => formData.get(`module:${module}`) === "on"),
  };

  if (id) {
    await prisma.plan.update({ where: { id }, data });
  } else {
    await prisma.plan.upsert({
      where: { slug },
      create: data,
      update: data,
    });
  }

  revalidatePath("/admin/plans");
  revalidatePath("/admin/businesses");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
}

export async function deletePlanAction(formData: FormData) {
  await requireAdmin();
  const planId = readText(formData, "planId");
  const plan = await getPlanById(planId);
  if (!plan) return;

  if ((plan.businessCount ?? 0) > 0) {
    await prisma.plan.update({ where: { id: planId }, data: { status: "INACTIVE" } });
  } else {
    await prisma.plan.delete({ where: { id: planId } });
  }

  revalidatePath("/admin/plans");
  revalidatePath("/admin/businesses");
}

export async function togglePlanStatusAction(formData: FormData) {
  await requireAdmin();
  const planId = readText(formData, "planId");
  const plan = await getPlanById(planId);
  if (!plan) return;

  await prisma.plan.update({
    where: { id: planId },
    data: { status: plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });

  revalidatePath("/admin/plans");
  revalidatePath("/admin/businesses");
}

export async function saveCurrencyAction(formData: FormData) {
  await requireAdmin();
  const currencies = await getAdminCurrencies();
  const code = readText(formData, "code").toUpperCase();
  if (!code) throw new Error("Código invalido.");

  const nextCurrency: AdminCurrency = {
    code,
    name: readText(formData, "name"),
    symbol: readText(formData, "symbol"),
    rate: readNumber(formData, "rate", 1),
    rounding: readText(formData, "rounding", "0.01"),
    active: formData.get("active") === "on",
    default: formData.get("default") === "on",
    country: readText(formData, "country"),
    autoProvider: readText(formData, "autoProvider", "MANUAL") === "BCV" ? "BCV" : "MANUAL",
  };

  const normalized = currencies.some((currency) => currency.code === code)
    ? currencies.map((currency) => (currency.code === code ? nextCurrency : currency))
    : [nextCurrency, ...currencies];

  await saveAdminCurrencies(nextCurrency.default
    ? normalized.map((currency) => ({ ...currency, default: currency.code === code }))
    : normalized);
  revalidatePath("/admin/currencies");
}

export async function toggleCurrencyAction(formData: FormData) {
  await requireAdmin();
  const code = readText(formData, "code").toUpperCase();
  const currencies = await getAdminCurrencies();
  await saveAdminCurrencies(currencies.map((currency) => (
    currency.code === code ? { ...currency, active: !currency.active } : currency
  )));
  revalidatePath("/admin/currencies");
}

export async function deleteCurrencyAction(formData: FormData) {
  await requireAdmin();
  const code = readText(formData, "code").toUpperCase();
  const currencies = await getAdminCurrencies();
  await saveAdminCurrencies(currencies.filter((currency) => currency.code !== code || currency.default));
  revalidatePath("/admin/currencies");
}

export async function registerAdminPaymentAction(formData: FormData) {
  const tenant = await requireAdmin();
  const businessId = readText(formData, "businessId");
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { users: { where: { role: "OWNER" }, take: 1 } },
  });
  if (!business) throw new Error("Negocio no encontrado.");

  const payment: AdminPayment = {
    id: crypto.randomUUID(),
    businessId,
    businessName: business.name,
    ownerName: readText(formData, "ownerName", business.users[0]?.fullName ?? ""),
    ownerEmail: readText(formData, "ownerEmail", business.users[0]?.email ?? ""),
    plan: readText(formData, "plan", business.plan),
    amount: readNumber(formData, "amount"),
    currency: readText(formData, "currency", "USD") as "USD" | "BS" | "CLP",
    method: readText(formData, "method", "PAGO_MOVIL"),
    reference: readText(formData, "reference"),
    paidAt: readText(formData, "paidAt", new Date().toISOString().slice(0, 10)),
    nextDueAt: readText(formData, "nextDueAt"),
    notes: readText(formData, "notes"),
    operator: tenant.currentUser.email,
  };

  await saveAdminPayments([payment, ...(await getAdminPayments())]);
  await prisma.business.update({
    where: { id: businessId },
    data: {
      subscriptionStatus: "ACTIVE",
      status: "ACTIVE",
      lastPaymentAt: new Date(payment.paidAt),
      nextPaymentAt: payment.nextDueAt ? new Date(payment.nextDueAt) : undefined,
      billingPaymentMethod: payment.method as BillingPaymentMethod,
    },
  });
  revalidatePath("/admin/accounting");
  revalidatePath("/admin/businesses");
}

export async function createAdminBusinessAction(formData: FormData) {
  await requireAdmin();
  const name = readText(formData, "name");
  const ownerEmail = readText(formData, "ownerEmail");
  const slugInput = readText(formData, "slug");
  const trialStart = new Date();
  const trialEnd = formData.get("trialEnd") ? new Date(readText(formData, "trialEnd")) : new Date(trialStart);
  if (!formData.get("trialEnd")) trialEnd.setDate(trialEnd.getDate() + readNumber(formData, "trial", 30));
  const slug = slugInput || await uniqueSlug(name, async (candidate) => (await prisma.business.count({ where: { slug: candidate } })) > 0);

  const requestedStatus = readText(formData, "status", "TRIAL");
  const selectedPlanId = readText(formData, "planId");
  const selectedPlan = selectedPlanId ? await getPlanById(selectedPlanId) : null;
  const legacyPlan = normalizeCommercialPlan((selectedPlan?.slug ?? readText(formData, "plan", "STARTER")).toUpperCase()) as BusinessPlan;
  const activeNow = formData.get("activateNow") === "on";
  const business = await prisma.business.create({
    data: {
      name,
      slug,
      phone: readText(formData, "phone") || null,
      currency: readText(formData, "currency", "USD"),
      exchangeRate: "1",
      plan: legacyPlan,
      planId: selectedPlan?.id,
      status: activeNow && requestedStatus !== "SUSPENDED" ? "ACTIVE" : "INACTIVE",
      subscriptionStatus: activeNow ? (requestedStatus as "TRIAL" | "ACTIVE" | "SUSPENDED") : "SUSPENDED",
      trialStart,
      trialEnd,
      nextPaymentAt: trialEnd,
      billingPaymentMethod: readText(formData, "method", "PAGO_MOVIL") as BillingPaymentMethod,
    },
  });

  if (formData.get("createOwner") === "on") {
    await prisma.user.create({
      data: {
        clerkUserId: `pending:${ownerEmail}:${business.id}`,
        businessId: business.id,
        fullName: readText(formData, "ownerName"),
        email: ownerEmail,
        role: "OWNER",
      },
    });
  }

  revalidatePath("/admin/businesses");
}
