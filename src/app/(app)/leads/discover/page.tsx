import Link from "next/link";
import { DiscoveryForm } from "@/components/discovery-form";
import { getGooglePlacesTextSearchUsage } from "@/lib/lead-discovery/usage";
import { requireWorkspace } from "@/lib/workspace";

export default async function DiscoverLeadsPage() {
  const { workspace } = await requireWorkspace();
  const usage = await getGooglePlacesTextSearchUsage(workspace.id);
  const percent = Math.min(100, (usage.used / usage.limit) * 100);

  return <div className="mx-auto max-w-5xl">
    <Link href="/leads" className="text-sm text-slate-400 transition hover:text-white">← Back to leads</Link>
    <div className="mt-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Lead discovery</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Find relevant prospects</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Define a focused search and review the discovered companies in your lead pipeline.</p></div>

    <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-200">Google Places usage</div>
          <div className="mt-1 text-xs text-slate-500">Monthly safety limit for company searches</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-100">{usage.used.toLocaleString("fi-FI")} / {usage.limit.toLocaleString("fi-FI")}</div>
          <div className="mt-1 text-xs text-slate-500">{usage.remaining.toLocaleString("fi-FI")} remaining</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>

    <div className="mt-7"><DiscoveryForm /></div>
  </div>;
}
