export default async function PosLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-background">{children}</div>;
}
