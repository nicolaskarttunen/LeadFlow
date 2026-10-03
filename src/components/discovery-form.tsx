"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { discoverLeadsAction } from "@/app/(app)/leads/discover/actions";
const discoveryInitial = { results: [], error: null };
const inputClass = "w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/[0.08]";
export function DiscoveryForm({ locale }: { locale: "fi" | "en" }) {
  const fi=locale==="fi"; const router=useRouter(); const [discovery,discover,finding]=useActionState(discoverLeadsAction,discoveryInitial);
  const [provider,setProvider]=useState<"prh-ytj"|"google-places">("prh-ytj"); const [providerOpen,setProviderOpen]=useState(false); const providerRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{ const close=(event:MouseEvent)=>{ if(providerRef.current&&!providerRef.current.contains(event.target as Node)) setProviderOpen(false); }; document.addEventListener("mousedown",close); return()=>document.removeEventListener("mousedown",close); },[]);
  useEffect(()=>{ if(discovery.results.length){ sessionStorage.setItem("leadflow.discovery.results",JSON.stringify(discovery.results)); router.push("/leads/discover/results"); } },[discovery.results,router]);
  return <div className="space-y-6"><form action={discover} className="surface rounded-3xl p-6 sm:p-7">
    <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-5">
      <h2 className="text-lg font-semibold text-slate-100">{fi?"Löydä yrityksiä":"Find companies"}</h2>
      <p className="text-xs leading-5 text-slate-500">{fi?"Valitse tietolähde ja rajaa, millaisia yrityksiä haluat löytää.":"Choose a data source and define the companies you want to find."}</p>
    </div>
    <div className="mt-5" ref={providerRef}>
      <input type="hidden" name="provider" value={provider}/>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={()=>setProvider("prh-ytj")} className={`rounded-2xl border p-4 text-left transition ${provider==="prh-ytj"?"border-violet-400/40 bg-violet-500/[0.09] ring-1 ring-violet-400/10":"border-white/[0.08] bg-white/[0.025] hover:border-white/[0.14]"}`}>
          <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-100">PRH/YTJ</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provider==="prh-ytj"?"bg-violet-400/15 text-violet-200":"bg-white/[0.05] text-slate-500"}`}>{fi?"SUOSITELTU":"RECOMMENDED"}</span></div>
          <div className="mt-1 text-xs text-slate-500">{fi?"Maksuton · Suomen yritysrekisteri":"Free · Finnish company register"}</div>
        </button>
        <button type="button" onClick={()=>setProvider("google-places")} className={`rounded-2xl border p-4 text-left transition ${provider==="google-places"?"border-violet-400/40 bg-violet-500/[0.09] ring-1 ring-violet-400/10":"border-white/[0.08] bg-white/[0.025] hover:border-white/[0.14]"}`}>
          <div className="font-semibold text-slate-100">Google Places</div>
          <div className="mt-1 text-xs text-slate-500">{fi?"Paikalliset yritykset · käyttää Google-hakukiintiötä":"Local businesses · uses Google search quota"}</div>
        </button>
      </div>
    </div>
    <div className="mt-7">
      <div className="mb-3"><div className="text-sm font-semibold text-slate-200">{fi?"Mistä etsitään?":"Where should we search?"}</div><div className="mt-1 text-xs text-slate-500">{fi?"Rajaa yritykset toimialan ja sijainnin perusteella.":"Narrow companies by industry and location."}</div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">{fi?"Toimiala":"Industry"}<input name="industry" placeholder={fi?"esim. sähköasennus":"e.g. electrical installation"} className={`mt-2 ${inputClass}`}/></label>
        <label className="text-sm font-medium text-slate-200">{fi?"Sijainti":"Location"}<input name="location" placeholder={fi?"esim. Jyväskylä":"e.g. Jyväskylä"} className={`mt-2 ${inputClass}`}/></label>
        {provider==="google-places"&&<label className="text-sm font-medium text-slate-200 sm:col-span-2">{fi?"Yrityksen koko":"Company size"}<input name="companySize" placeholder={fi?"esim. 1–20 työntekijää":"e.g. 1–20 employees"} className={`mt-2 ${inputClass}`}/><span className="mt-1.5 block text-[11px] font-normal text-slate-500">{fi?"Käytetään liidin arvioinnissa, jos kokotieto on saatavilla.":"Used in lead evaluation when size data is available."}</span></label>}
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