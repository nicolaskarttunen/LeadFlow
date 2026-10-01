"use client";
import { useActionState } from "react";
import { addDiscoveredLeadsAction, discoverLeadsAction } from "@/app/(app)/leads/discover/actions";
const discoveryInitial = { results: [], error: null };
const addInitial = { message: null, error: null };
const inputClass = "w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/[0.08]";

export function DiscoveryForm() {
  const [discovery, discover, finding] = useActionState(discoverLeadsAction, discoveryInitial);
  const [addState, addSelected, adding] = useActionState(addDiscoveredLeadsAction, addInitial);
  return <div className="space-y-6">
    <form action={discover} className="surface rounded-3xl p-6 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">Industry<input name="industry" placeholder="e.g. construction" className={`mt-2 ${inputClass}`} /></label>
        <label className="text-sm font-medium text-slate-200">Location<input name="location" placeholder="e.g. Jyväskylä" className={`mt-2 ${inputClass}`} /></label>
        <label className="text-sm font-medium text-slate-200">Company size<input name="companySize" placeholder="e.g. 1–20 employees" className={`mt-2 ${inputClass}`} /></label>
        <label className="text-sm font-medium text-slate-200">Keywords<input name="keywords" placeholder="SEO, website, renovation" className={`mt-2 ${inputClass}`} /></label>
      </div>
      {discovery.error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{discovery.error}</div> : null}
      <div className="mt-6 flex justify-end border-t border-white/[0.07] pt-5">
        <button disabled={finding} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{finding ? "Finding leads..." : "Find leads"}</button>
      </div>
    </form>

    {discovery.results.length ? <form action={addSelected} className="surface overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
        <div><h2 className="font-semibold text-slate-100">Discovery results</h2><p className="mt-1 text-xs text-slate-400">Review the companies before adding them to your pipeline.</p></div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{discovery.results.length} found</span>
      </div>
      <div className="divide-y divide-white/[0.07]">
        {discovery.results.map((lead, index) => <label key={lead.domain ?? `${lead.companyName}-${index}`} className="grid cursor-pointer gap-3 px-6 py-5 transition hover:bg-white/[0.025] sm:grid-cols-[24px_1.2fr_1fr]">
          <input type="checkbox" name="selectedLead" value={JSON.stringify(lead)} defaultChecked className="mt-1 h-4 w-4 accent-violet-500" />
          <div><div className="font-medium text-slate-100">{lead.companyName}</div><div className="mt-1 text-xs text-slate-400">{lead.domain ?? "No domain found"}</div></div>
          <div><div className="text-sm text-slate-300">{lead.industry ?? "Industry unknown"} · {lead.location ?? "Location unknown"}</div><div className="mt-1 text-xs leading-5 text-slate-400">{lead.whyRelevant ?? "Review before adding."}</div></div>
        </label>)}
      </div>
      {(addState.error || addState.message) ? <div className="px-6 pt-5"><div className={addState.error ? "rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200" : "rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200"}>{addState.error ?? addState.message}</div></div> : null}
      <div className="flex justify-end border-t border-white/[0.07] px-6 py-5">
        <button disabled={adding} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{adding ? "Adding..." : "Add selected to leads"}</button>
      </div>
    </form> : null}
  </div>;
}
