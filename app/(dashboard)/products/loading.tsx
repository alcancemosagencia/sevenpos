export default function ProductsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-3">
      <div className="h-8 w-44 rounded-lg bg-muted" />
      <div className="h-11 rounded-lg bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 rounded-lg border bg-card" />
        ))}
      </div>
    </div>
  );
}
