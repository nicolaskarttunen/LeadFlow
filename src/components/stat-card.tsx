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
    <div className="surface rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/15">
      <div className="text-sm font-medium text-slate-300">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs leading-5 text-slate-400">{hint}</div> : null}
    </div>
  );
}
