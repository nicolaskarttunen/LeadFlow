import Link from "next/link";
import { DiscoveryForm } from "@/components/discovery-form";
import { getCurrentLocale } from "@/lib/current-locale";
import { getGooglePlacesTextSearchUsage } from "@/lib/lead-discovery/usage";
import { requireWorkspace } from "@/lib/workspace";

export default async function DiscoverLeadsPage() {
  const { workspace } = await requireWorkspace();
  const [usage, locale] = await Promise.all([getGooglePlacesTextSearchUsage(workspace.id), getCurrentLocale()]);
  const fi = locale === "fi";
  const percent = Math.min(100, (usage.globalUsed / usage.globalLimit) * 100);
  return <div className="mx-auto max-w-5xl">
    <Link href="/leads" className="text-sm text-slate-400 transition hover:text-white">← {fi ? "Takaisin liideihin" : "Back to leads"}</Link>
    <div className="mt-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Liidien etsintä" : "Lead discovery"}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Löydä potentiaalisia asiakkaita" : "Find relevant prospects"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{fi ? "Rajaa haku ja tarkista löydetyt yritykset ennen niiden lisäämistä liideihin." : "Define a focused search and review the discovered companies before adding them to your pipeline."}</p></div>
    <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4"><div className="flex items-center justify-between gap-4"><div><div className="text-sm font-medium text-slate-200">{fi ? "Google Places -käyttö" : "Google Places usage"}</div><div className="mt-1 text-xs text-slate-500">{fi ? `LeadFlow'n kuukausittainen turvaraja · Työtilasi: ${usage.workspaceUsed.toLocaleString("fi-FI")} hakua` : `LeadFlow-wide monthly safety limit · Your workspace: ${usage.workspaceUsed.toLocaleString("en-US")} searches`}</div></div><div className="text-right"><div className="text-sm font-semibold text-slate-100">{usage.globalUsed.toLocaleString()} / {usage.globalLimit.toLocaleString()}</div><div className="mt-1 text-xs text-slate-500">{usage.globalRemaining.toLocaleString()} {fi ? "jäljellä" : "remaining"}</div></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${percent}%` }} /></div></div>
    <div className="mt-7"><DiscoveryForm locale={locale} /></div>
  </div>;
}
