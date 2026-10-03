"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { addDiscoveredLeadsAction } from "@/app/(app)/leads/discover/actions";
import type { DiscoveredLead } from "@/lib/lead-discovery";

const initial = { message: null, error: null };

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

  return <form action={addSelected} className="surface overflow-hidden rounded-3xl">
    <div className="flex flex-col gap-3 border-b border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-100">{fi ? "Löydetyt yritykset" : "Found companies"}</h2><p className="mt-1 text-xs text-slate-400">{fi ? "Valitse yritykset, jotka haluat analysoitavaksi Uudet liidit -jonoon." : "Choose companies to analyze in the New leads queue."}</p></div><span className="w-fit rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{results.length} {fi ? "löytyi" : "found"}</span></div>
    <div className="divide-y divide-white/[0.07]">{results.map((lead,index)=><label key={lead.providerPlaceId??lead.domain??`${lead.companyName}-${index}`} className="grid cursor-pointer gap-3 px-6 py-5 transition hover:bg-white/[0.02] sm:grid-cols-[24px_1.1fr_1fr]"><input type="checkbox" name="selectedLead" value={JSON.stringify(lead)} defaultChecked className="mt-1 h-4 w-4 accent-violet-500"/><div><div className="font-medium text-slate-100">{lead.companyName}</div><div className="mt-1 text-xs text-slate-500">{lead.domain ?? (fi ? "Verkkotunnusta ei löytynyt" : "No domain found")}</div></div><div><div className="text-sm text-slate-300">{lead.industry ?? (fi ? "Toimiala ei tiedossa" : "Industry unknown")} · {lead.location ?? (fi ? "Sijainti ei tiedossa" : "Location unknown")}</div><div className="mt-1 text-xs leading-5 text-slate-400">{lead.whyRelevant ?? (fi ? "Tarkista ennen lisäämistä." : "Review before adding.")}</div></div></label>)}</div>
    {(state.error||state.message)&&<div className="px-6 pt-5"><div className={state.error?"rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200":"rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200"}>{state.error??state.message}</div></div>}
    <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><Link href="/leads/discover" className="text-center text-sm text-slate-400 transition hover:text-white">← {fi ? "Muokkaa hakua" : "Edit search"}</Link><button disabled={adding} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{adding ? (fi ? "Lisätään ja analysoidaan..." : "Adding and analyzing...") : (fi ? "Lisää valitut analysoitavaksi" : "Add selected for analysis")}</button></div>
  </form>;
}
