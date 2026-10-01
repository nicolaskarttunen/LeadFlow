export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-7 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-7">
        <div className="mb-6 text-sm font-semibold">LeadFlow</div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
