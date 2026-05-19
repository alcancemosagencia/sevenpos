import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex min-h-40 flex-col items-center justify-center p-6 text-center", className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function AppErrorState({
  title = "No pudimos cargar esta sección",
  description = "Intenta nuevamente. Si el problema continúa, revisa la conexión o permisos del negocio.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button type="button" onClick={onRetry} className="mt-4 h-9">
          Reintentar
        </Button>
      ) : null}
    </Card>
  );
}

export function AppLoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function AppSectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border bg-card" />
        ))}
      </div>
      <div className="space-y-2 rounded-lg border bg-card p-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
