import { redirect } from "next/navigation";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";
import { getTenantContext } from "@/lib/tenant";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const tenant = await getTenantContext();

  if (!tenant) {
    redirect("/sign-in");
  }

  if (tenant.isSuperAdmin) {
    redirect("/admin");
  }

  if (tenant.currentBusiness) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(218_92%_92%),transparent_34%),linear-gradient(180deg,hsl(220_33%_98%),hsl(220_33%_95%))] px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-7 text-center">
          <SevenPosLogo className="mb-5 justify-center text-foreground" />
          <h1 className="text-3xl font-semibold tracking-normal">Configura tu negocio</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Onboarding SaaS premium, multi-tenant y listo para operar sin sacrificar velocidad.
          </p>
        </div>
        <OnboardingForm defaultEmail={tenant.currentUser.email} />
      </div>
    </main>
  );
}
