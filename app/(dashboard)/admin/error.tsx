"use client";

import { AppErrorState } from "@/components/shared/app-states";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppErrorState
      title="No pudimos cargar el admin"
      description="Revisa permisos, conexión o el estado de la base de datos."
      onRetry={reset}
    />
  );
}
