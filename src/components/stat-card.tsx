export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-600">{hint}</div> : null}
    </div>
  );
}
