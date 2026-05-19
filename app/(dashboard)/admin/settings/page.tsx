import { AdminSettingsForm } from "@/features/admin/admin-settings-form";
import { getAdminSettings } from "@/features/admin/admin-store";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Global SaaS</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Parámetros reales de plataforma, branding y operaciones globales.</p>
      </div>

      <AdminSettingsForm settings={settings} />
    </section>
  );
}
