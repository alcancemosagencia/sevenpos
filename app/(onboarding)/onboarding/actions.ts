"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import type { BusinessType } from "@/lib/business-features";

export type OnboardingState = {
  error?: string;
};

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Completa los campos requeridos.");
  }

  return value.trim();
}

export async function createBusinessAction(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  try {
    const name = readRequiredString(formData, "name");
    const currency = readRequiredString(formData, "currency");
    const exchangeRateValue = Number(formData.get("exchangeRate") ?? 1);
    const phone = formData.get("phone");
    const email = formData.get("email");
    const businessType = readRequiredString(formData, "businessType") as BusinessType;
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const address = formData.get("address");
    const city = formData.get("city");
    const country = formData.get("country");

    if (!Number.isFinite(exchangeRateValue) || exchangeRateValue <= 0) {
      return { error: "La tasa inicial debe ser mayor a cero." };
    }

    const slug = await uniqueSlug(name, async (candidate) => {
      const count = await prisma.business.count({ where: { slug: candidate } });
      return count > 0;
    });

    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    const result = await prisma.$transaction(async (tx) => {
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 30);

      const business = await tx.business.create({
        data: {
          name,
          slug,
          email: typeof email === "string" && email.trim() ? email.trim() : primaryEmail,
          phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
          ownerFirstName: typeof firstName === "string" && firstName.trim() ? firstName.trim() : null,
          ownerLastName: typeof lastName === "string" && lastName.trim() ? lastName.trim() : null,
          address: typeof address === "string" && address.trim() ? address.trim() : null,
          city: typeof city === "string" && city.trim() ? city.trim() : null,
          country: typeof country === "string" && country.trim() ? country.trim() : null,
          businessType,
          currency,
          exchangeRate: exchangeRateValue.toString(),
          plan: "STARTER",
          status: "ACTIVE",
          subscriptionStatus: "TRIAL",
          trialStart,
          trialEnd,
          nextPaymentAt: trialEnd,
        },
      });

      const user = await tx.user.upsert({
        where: { clerkUserId: clerkUser.id },
        create: {
          clerkUserId: clerkUser.id,
          businessId: business.id,
          email: primaryEmail,
          fullName: clerkUser.fullName,
          role: "OWNER",
        },
        update: {
          businessId: business.id,
          email: primaryEmail,
          fullName: clerkUser.fullName,
          role: "OWNER",
        },
      });

      return { business, user };
    });

    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        businessId: result.business.id,
        role: result.user.role,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No pudimos crear el negocio.",
    };
  }

    redirect("/onboarding/ready");
}
