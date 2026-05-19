export function MetricValue({ children }: { children: React.ReactNode }) {
  return <div className="text-[26px] font-semibold leading-none tracking-normal text-foreground">{children}</div>;
}

export function FadeIn({ children }: { children: React.ReactNode; delay?: number }) {
  return <>{children}</>;
}
