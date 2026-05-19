import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,hsl(218_92%_90%),transparent_28%),linear-gradient(135deg,hsl(224_42%_8%),hsl(218_54%_18%)_46%,hsl(220_33%_96%)_46%)] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-white/55 bg-white/88 p-5 shadow-[0_30px_100px_hsl(224_42%_8%/0.28)] backdrop-blur-xl">
        <SevenPosLogo className="justify-center text-foreground" markClassName="size-12" />
        <div className="mt-7 text-center">
          <h1 className="text-3xl font-semibold tracking-normal">Prueba gratis 30 días</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Crea tu cuenta y configura SevenPOS para comercio o restaurante en minutos.</p>
        </div>
        <div className="mt-6 grid gap-2">
          <Link href="/sign-up" className="flex h-12 items-center justify-center gap-2 rounded-lg border bg-card text-sm font-semibold shadow-sm transition hover:border-primary/40">
            Continuar con Google
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/sign-up" className="flex h-12 items-center justify-center gap-2 rounded-lg border bg-card text-sm font-semibold shadow-sm transition hover:border-primary/40">
            Continuar con Microsoft
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/sign-up" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_hsl(218_92%_35%/0.22)]">
            <Mail className="size-4" />
            Continuar con email
          </Link>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          ¿Ya tienes cuenta? <Link href="/sign-in" className="font-semibold text-primary">Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}
