import { notFound } from "next/navigation";
import { PublicMenuClient } from "@/features/public-ordering/public-menu-client";
import type { PublicBusinessSettings } from "@/features/public-ordering/types";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PublicStorePageProps = {
  params: Promise<{ slug: string }>;
};

const defaultPublicSettings: PublicBusinessSettings = {
  coverImageUrl: null,
  logoUrl: null,
  rating: 4.8,
  distanceLabel: "0.8 km",
  etaLabel: "25-35 min",
  deliveryEnabled: true,
  pickupEnabled: true,
  dineInEnabled: false,
  openTime: "09:00",
  closeTime: "21:00",
  activeDays: "1,2,3,4,5,6",
  deliveryFee: 0,
  taxRate: 0,
  termsUrl: null,
};

export default async function PublicStorePage({ params }: PublicStorePageProps) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      currency: true,
      exchangeRate: true,
      businessType: true,
      status: true,
      publicSettings: true,
      categories: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
      products: {
        where: { isActive: true, isPublic: true },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          categoryId: true,
          priceUsd: true,
          stock: true,
          category: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      },
    },
  });

  if (!business || business.status !== "ACTIVE") notFound();

  const settings = business.publicSettings;

  return (
    <PublicMenuClient
      business={{
        id: business.id,
        slug: business.slug,
        name: business.name,
        phone: business.phone,
        address: business.address,
        city: business.city,
        country: business.country,
        currency: business.currency,
        exchangeRate: decimalToNumber(business.exchangeRate),
        businessType: business.businessType,
        settings: settings
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
          : defaultPublicSettings,
        categories: business.categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
        products: business.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? null,
          price: decimalToNumber(product.priceUsd),
          stock: product.stock,
        })),
      }}
    />
  );
}
