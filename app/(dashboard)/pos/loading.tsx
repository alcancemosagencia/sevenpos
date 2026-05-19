export default function PosLoading() {
  return (
    <div className="min-h-screen bg-background px-4 pt-3 sm:px-6 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded-lg bg-muted" />
          <div className="h-5 w-40 rounded-lg bg-muted" />
        </div>
        <div className="h-12 w-20 rounded-lg bg-muted" />
      </div>
      <div className="mb-3 h-10 rounded-lg bg-muted shadow-[0_8px_20px_hsl(220_20%_10%/0.045)]" />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-9 w-20 shrink-0 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-[1.08/1] bg-muted" />
            <div className="space-y-2 p-2">
              <div className="h-4 rounded-lg bg-muted" />
              <div className="h-4 w-14 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
