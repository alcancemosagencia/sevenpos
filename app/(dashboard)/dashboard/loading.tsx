import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-56 rounded-lg bg-muted" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-28 bg-muted/45" />
        ))}
      </div>
      <Card className="h-48 bg-muted/35" />
    </div>
  );
}
