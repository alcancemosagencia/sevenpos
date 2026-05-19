"use client";

import { AppErrorState } from "@/components/shared/app-states";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorState onRetry={reset} />;
}
