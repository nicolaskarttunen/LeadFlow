"use client";
import { useActionState } from "react";
import { discoverLeadsAction } from "@/app/(app)/leads/discover/actions";
const initialDiscoveryState = { message: null, error: null };
const inputClass = "w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/[0.08]";
export function DiscoveryForm() {
  const [state, action, pending] = useActionState(discoverLeadsAction, initialDiscoveryState);
  return <form action={action} className="surface rounded-3xl p-6 sm:p-7">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-200">Industry<input name="industry" placeholder="e.g. construction" className={`mt-2 ${inputClass}`} /></label>
      <label className="text-sm font-medium text-slate-200">Location<input name="location" placeholder="e.g. Jyväskylä" className={`mt-2 ${inputClass}`} /></label>
      <label className="text-sm font-medium text-slate-200">Company size<input name="companySize" placeholder="e.g. 1–20 employees" className={`mt-2 ${inputClass}`} /></label>
      <label className="text-sm font-medium text-slate-200">Keywords<input name="keywords" placeholder="SEO, website, renovation" className={`mt-2 ${inputClass}`} /></label>
    </div>
    {state.error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{state.error}</div> : null}
    {state.message ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{state.message}</div> : null}
    <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-xl text-xs leading-5 text-slate-400">This first version uses safe example data so we can validate the workflow before connecting a live company-data provider.</p>
      <button disabled={pending} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Finding leads..." : "Find leads"}</button>
    </div>
  </form>;
}
