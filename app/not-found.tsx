import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-[0_18px_50px_hsl(220_20%_10%/0.08)]">
        <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
          S7
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-normal">Pagina no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">La ruta no existe o ya no esta disponible.</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
