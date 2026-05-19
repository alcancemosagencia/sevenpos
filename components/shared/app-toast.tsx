import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppToast({
  message,
  tone = "info",
  className,
}: {
  message: string;
  tone?: "success" | "error" | "info";
  className?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? XCircle : Info;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-[0_12px_35px_hsl(220_20%_10%/0.10)]",
        tone === "success" && "border-primary/20 bg-primary/10 text-primary",
        tone === "error" && "border-destructive/20 bg-destructive/10 text-destructive",
        tone === "info" && "bg-card text-foreground",
        className,
      )}
      role="status"
    >
      <Icon className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
