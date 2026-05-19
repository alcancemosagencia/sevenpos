import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubscriptionBlocked({
  businessName,
  status,
}: {
  businessName: string;
  status: string;
}) {
  const whatsapp = "https://wa.me/584120000000?text=Hola%2C%20quiero%20reactivar%20mi%20suscripcion%20SevenPOS";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-lg border bg-card p-5 text-center shadow-[0_24px_80px_hsl(220_20%_10%/0.16)]">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <MessageCircle className="size-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">SevenPOS Billing</p>
        <h1 className="mt-2 text-2xl font-semibold">Tu suscripcion vencio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {businessName} esta en estado {status}. Contacta soporte para reactivar el acceso operativo.
        </p>
        <Button asChild className="mt-5 h-11 w-full">
          <a href={whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            WhatsApp soporte
          </a>
        </Button>
      </section>
    </main>
  );
}
