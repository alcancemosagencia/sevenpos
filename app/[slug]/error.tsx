"use client";

import { AppErrorState } from "@/components/shared/app-states";

export default function PublicStoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center justify-center p-4">
      <AppErrorState title="No pudimos cargar este menú" onRetry={reset} />
    </main>
  );
}
