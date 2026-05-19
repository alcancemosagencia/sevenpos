import Link from "next/link";
import { CheckCircle2, Monitor, Settings, ShoppingCart } from "lucide-react";

export default function OnboardingReadyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsl(218_92%_92%),transparent_34%),linear-gradient(180deg,hsl(220_33%_98%),hsl(220_33%_95%))] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border bg-white/90 p-5 text-center shadow-[0_24px_90px_hsl(218_40%_30%/0.14)] backdrop-blur-xl">
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-normal">Tu negocio está listo</h1>
        <p className="mt-2 text-sm text-muted-foreground">SevenPOS ya preparó tu espacio operativo. Puedes vender, revisar métricas o terminar hardware.</p>
        <div className="mt-5 grid gap-2">
          <Link href="/pos" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <ShoppingCart className="size-4" />
            Ir al POS
          </Link>
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold">
            <Monitor className="size-4" />
            Ir al dashboard
          </Link>
          <Link href="/settings/hardware" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold">
            <Settings className="size-4" />
            Configurar hardware
          </Link>
        </div>
      </section>
    </main>
  );
}
