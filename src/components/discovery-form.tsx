"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { discoverLeadsAction } from "@/app/(app)/leads/discover/actions";
const discoveryInitial = { results: [], error: null };
const inputClass = "w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/[0.08]";
export function DiscoveryForm({ locale }: { locale: "fi" | "en" }) {
  const fi=locale==="fi"; const router=useRouter(); const [discovery,discover,finding]=useActionState(discoverLeadsAction,discoveryInitial);
  useEffect(()=>{ if(discovery.results.length){ sessionStorage.setItem("leadflow.discovery.results",JSON.stringify(discovery.results)); router.push("/leads/discover/results"); } },[discovery.results,router]);
  return <div className="space-y-6"><form action={discover} className="surface rounded-3xl p-6 sm:p-7">
    <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-5">
      <h2 className="text-lg font-semibold text-slate-100">{fi?"Löydä yrityksiä":"Find companies"}</h2>
      <p className="text-xs leading-5 text-slate-500">{fi?"Rajaa, millaisia yrityksiä haluat löytää. LeadFlow hakee sopivat yritykset puolestasi.":"Define the companies you want to find. LeadFlow handles the search for you."}</p>
    </div>
    <input type="hidden" name="provider" value="prh-ytj"/>
    <div className="mt-7">
      <div className="mb-3"><div className="text-sm font-semibold text-slate-200">{fi?"Mistä etsitään?":"Where should we search?"}</div><div className="mt-1 text-xs text-slate-500">{fi?"Rajaa yritykset toimialan ja sijainnin perusteella.":"Narrow companies by industry and location."}</div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">{fi?"Toimiala":"Industry"}<input name="industry" placeholder={fi?"esim. sähköasennus":"e.g. electrical installation"} className={`mt-2 ${inputClass}`}/></label>
        <label className="text-sm font-medium text-slate-200">{fi?"Sijainti":"Location"}<input name="location" placeholder={fi?"esim. Jyväskylä":"e.g. Jyväskylä"} className={`mt-2 ${inputClass}`}/></label>
      </div>
    </div>
    <div className="mt-7 border-t border-white/[0.07] pt-6">
      <div className="mb-3"><div className="text-sm font-semibold text-slate-200">{fi?"Mitä LeadFlow etsii yrityksistä?":"What should LeadFlow look for?"}</div><div className="mt-1 text-xs text-slate-500">{fi?"Kerro tarpeet tai ostosignaalit, joiden perusteella yrityksiä arvioidaan myöhemmin.":"Add needs or buying signals used later when evaluating companies."}</div></div>
      <label className="text-sm font-medium text-slate-200">{fi?"Tarpeet / ostosignaalit":"Needs / buying signals"}<input name="keywords" placeholder={fi?"esim. verkkosivut, SEO, rekrytointi":"e.g. website, SEO, recruitment"} className={`mt-2 ${inputClass}`}/></label>
    </div>
    {discovery.error&&<div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{discovery.error}</div>}
    <div className="mt-6 flex justify-end border-t border-white/[0.07] pt-5"><button disabled={finding} className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{finding?(fi?"Etsitään...":"Finding leads..."):(fi?"Etsi liidejä":"Find leads")}</button></div>
  </form>
</div>;
}