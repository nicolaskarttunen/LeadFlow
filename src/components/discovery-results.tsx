"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { addDiscoveredLeadsAction } from "@/app/(app)/leads/discover/actions";
import type { DiscoveredLead } from "@/lib/lead-discovery";

const initial = { message: null, error: null };

function websiteLabel(lead: DiscoveredLead, fi: boolean) {
  if (lead.domain) return lead.domain;
  if (lead.websiteStatus === "MISSING") {
    return fi ? "Google-tiedossa ei omaa verkkosivua" : "No owned website listed in Google data";
  }
  return fi ? "Verkkosivua ei vielä varmennettu" : "Website not yet verified";
}

function locationLabel(location: string | undefined, fi: boolean) {
  if (!location) return fi ? "Sijainti ei tiedossa" : "Location unknown";
  const normalized = location.toUpperCase();
  if (normalized.includes("OSOITE TUNTEMATON") || normalized.startsWith("00000")) {
    return fi ? "Sijainti ei tiedossa" : "Location unknown";
  }
  return location;
}

function isVerifiedOpportunity(lead: DiscoveredLead) {
  return (lead.buyingSignals?.length ?? 0) > 0
    && (lead.websiteResearchStatus === "ANALYZED"
      || lead.websiteResearchStatus === "NO_WEBSITE_LISTED");
}

export function DiscoveryResults({ locale }: { locale: "fi" | "en" }) {
  const fi = locale === "fi";
  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [state, addSelected, adding] = useActionState(addDiscoveredLeadsAction, initial);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("leadflow.discovery.results");
      setResults(raw ? JSON.parse(raw) : []);
    } catch {
      setResults([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  if (!loaded) return <div className="surface rounded-3xl px-6 py-16 text-center text-sm text-slate-400">{fi ? "Ladataan hakutuloksia..." : "Loading results..."}</div>;
  if (!results.length) return <div className="surface rounded-3xl px-6 py-16 text-center"><div className="font-semibold text-slate-100">{fi ? "Hakutuloksia ei löytynyt" : "No search results found"}</div><p className="mt-2 text-sm text-slate-400">{fi ? "Tee uusi haku ja palaa sitten tuloksiin." : "Run a new search and return to the results."}</p><Link href="/leads/discover" className="mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white">{fi ? "Takaisin hakuun" : "Back to search"}</Link></div>;

  const verifiedCount = results.filter(isVerifiedOpportunity).length;

  return <form action={addSelected} className="surface overflow-hidden rounded-3xl">
    <div className="flex flex-col gap-3 border-b border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-100">{fi ? "Löydetyt yritykset" : "Found companies"}</h2><p className="mt-1 text-xs text-slate-400">{fi ? "Varmennetut myyntimahdollisuudet on valittu valmiiksi. Lisätutkimusta vaativat jäävät valitsematta." : "Verified sales opportunities are preselected. Leads needing more research stay unselected."}</p></div><div className="flex flex-wrap gap-2"><span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-xs text-emerald-200">{verifiedCount} {fi ? "varmennettua" : "verified"}</span><span className="w-fit rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{results.length} {fi ? "löytyi" : "found"}</span></div></div>
    <div className="divide-y divide-white/[0.07]">{results.map((lead,index)=>{const verified=isVerifiedOpportunity(lead);const signalCount=lead.buyingSignals?.length??0;return <label key={lead.providerPlaceId??lead.domain??`${lead.companyName}-${index}`} className="grid cursor-pointer gap-4 px-6 py-5 transition hover:bg-white/[0.02] sm:grid-cols-[24px_0.95fr_1.35fr]"><input type="checkbox" name="selectedLead" value={JSON.stringify(lead)} defaultChecked={verified} className="mt-1 h-4 w-4 accent-violet-500"/><div><div className="font-medium text-slate-100">{lead.companyName}</div><div className="mt-1 text-xs text-slate-500">{websiteLabel(lead,fi)}</div><div className="mt-3 flex flex-wrap gap-2">{lead.profileFitScore!==undefined&&<span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-[11px] font-medium text-violet-200">{fi?"Sopivuus":"Fit"} {lead.profileFitScore}/100</span>}{signalCount>0?<span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-200">{signalCount} {fi?"ostosignaalia":"buying signals"}</span>:lead.websiteResearchStatus==="ANALYZED"?<span className="rounded-full border border-slate-400/20 bg-slate-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-slate-300">{fi?"Ei vahvaa signaalia":"No strong signal"}</span>:<span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-amber-200">{fi?"Lisätutkimus tarvitaan":"More research needed"}</span>}</div></div><div><div className="text-sm text-slate-300">{lead.industry ?? (fi ? "Toimiala ei tiedossa" : "Industry unknown")} · {locationLabel(lead.location,fi)}</div>{signalCount>0?<div className="mt-3"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">{fi?"Havaitut ostosignaalit":"Verified buying signals"}</div><div className="mt-2 flex flex-wrap gap-2">{lead.buyingSignals!.slice(0,3).map((signal)=><span key={signal.key} title={signal.evidence} className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-xs text-slate-200">{signal.label}</span>)}</div>{lead.recommendedAngle&&<div className="mt-3 text-xs leading-5 text-slate-400"><span className="font-medium text-slate-300">{fi?"Suositeltu myyntikulma:":"Suggested angle:"}</span> {lead.recommendedAngle}</div>}</div>:<div className="mt-2 text-xs leading-5 text-slate-400">{lead.websiteResearchStatus==="ANALYZED"?(fi?"Verkkosivu tarkistettiin, mutta tästä nopeasta analyysistä ei löytynyt vahvaa ostosignaalia.":"The website was checked, but this quick analysis did not find a strong buying signal."):(lead.whyRelevant ?? (fi ? "Tarkista ennen lisäämistä." : "Review before adding."))}</div>}</div></label>})}</div>
    {(state.error||state.message)&&<div className="px-6 pt-5"><div className={state.error?"rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200":"rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200"}>{state.error??state.message}</div></div>}
    <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><Link href="/leads/discover" className="text-center text-sm text-slate-400 transition hover:text-white">← {fi ? "Muokkaa hakua" : "Edit search"}</Link><button disabled={adding||verifiedCount===0} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{adding ? (fi ? "Lisätään ja analysoidaan..." : "Adding and analyzing...") : (fi ? `Lisää valitut analysoitavaksi` : "Add selected for analysis")}</button></div>
  </form>;
}
