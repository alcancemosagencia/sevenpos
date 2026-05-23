import { PublicMenuSettingsClient } from "@/features/public-ordering/public-menu-settings-client";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function PublicMenuPaymentsSettingsPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId || !tenant.currentBusiness) return null;

  const settings = await prisma.businessPublicSettings.findUnique({
    where: { businessId: tenant.businessId },
  });
  const paymentMethods = await prisma.businessPaymentMethod.findMany({
    where: { businessId: tenant.businessId },
    select: {
      id: true,
      type: true,
      enabled: true,
      title: true,
      instructions: true,
      alias: true,
      phone: true,
      email: true,
      qrImage: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PublicMenuSettingsClient
      business={{
        name: tenant.currentBusiness.name,
        slug: tenant.currentBusiness.slug,
      }}
      settings={
        settings
          ? {
              coverImageUrl: settings.coverImageUrl,
              logoUrl: settings.logoUrl,
              rating: decimalToNumber(settings.rating),
              distanceLabel: settings.distanceLabel,
              etaLabel: settings.etaLabel,
              deliveryEnabled: settings.deliveryEnabled,
              pickupEnabled: settings.pickupEnabled,
              dineInEnabled: settings.dineInEnabled,
              openTime: settings.openTime,
              closeTime: settings.closeTime,
              activeDays: settings.activeDays,
              deliveryFee: decimalToNumber(settings.deliveryFee),
              taxRate: decimalToNumber(settings.taxRate),
              termsUrl: settings.termsUrl,
            }
          : null
      }
      paymentMethods={paymentMethods}
      initialSection="payments"
    />
  );
}
