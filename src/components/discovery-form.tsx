"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { discoverLeadsAction } from "@/app/(app)/leads/discover/actions";

const discoveryInitial = { results: [], error: null };
const inputClass = "w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/[0.08]";

type SalesProfile = {
  offering: string;
  targetCustomer: string;
  industries: string[];
  regions: string[];
  companySize: string;
  signals: string[];
};

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-3 py-1.5 text-xs font-medium text-violet-200">{children}</span>;
}

export function DiscoveryForm({ locale, profile }: { locale: "fi" | "en"; profile: SalesProfile | null }) {
  const fi = locale === "fi";
  const router = useRouter();
  const [discovery, discover, finding] = useActionState(discoverLeadsAction, discoveryInitial);

  useEffect(() => {
    if (!discovery.results.length) return;
    sessionStorage.setItem("leadflow.discovery.results", JSON.stringify(discovery.results));
    router.push("/leads/discover/results");
  }, [discovery.results, router]);

  if (!profile) {
    return <div className="surface rounded-3xl p-6 sm:p-7">
      <div className="text-lg font-semibold text-slate-100">{fi ? "Luo ensin Myyntiprofiili" : "Create your Sales profile first"}</div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{fi ? "LeadFlow tarvitsee tiedon siitä mitä myyt ja kenelle, jotta haku löytää oikeanlaisia yrityksiä." : "LeadFlow needs to know what you sell and who you sell to before it can find relevant companies."}</p>
      <Link href="/settings/prospecting" className="mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">{fi ? "Määritä Myyntiprofiili" : "Set up Sales profile"}</Link>
    </div>;
  }

  const allFinland = profile.regions.some((region) => region.trim().toLowerCase() === "suomi");
  const customRegions = profile.regions.filter((region) => region.trim().toLowerCase() !== "suomi");
  const canSearch = profile.industries.length > 0 || customRegions.length > 0;

  return <div className="space-y-5">
    <section className="surface rounded-3xl p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">{fi ? "Myyntiprofiilisi" : "Your Sales profile"}</div>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">{profile.offering || (fi ? "Palvelua ei ole vielä kuvattu" : "Offering not described yet")}</h2>
          {profile.targetCustomer ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{profile.targetCustomer}</p> : null}
        </div>
        <Link href="/settings/prospecting" className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-violet-400/30 hover:text-white">{fi ? "Muokkaa profiilia" : "Edit profile"}</Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fi ? "Toimialat" : "Industries"}</div>
          <div className="mt-2 text-sm text-slate-200">{profile.industries.length ? profile.industries.join(", ") : (fi ? "Ei rajausta" : "No restriction")}</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fi ? "Alue" : "Region"}</div>
          <div className="mt-2 text-sm text-slate-200">{profile.regions.length ? profile.regions.join(", ") : (fi ? "Ei määritetty" : "Not defined")}</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fi ? "Yrityksen koko" : "Company size"}</div>
          <div className="mt-2 text-sm text-slate-200">{profile.companySize || (fi ? "Ei rajausta" : "Any size")}</div>
        </div>
      </div>

      {profile.signals.length ? <div className="mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fi ? "LeadFlow etsii näitä signaaleja" : "LeadFlow looks for these signals"}</div>
        <div className="mt-2 flex flex-wrap gap-2">{profile.signals.map((signal) => <Chip key={signal}>{signal}</Chip>)}</div>
      </div> : null}
    </section>

    <form action={discover} className="surface rounded-3xl p-6 sm:p-7">
      <div className="border-b border-white/[0.07] pb-5">
        <h2 className="text-lg font-semibold text-slate-100">{fi ? "Käynnistä uusi haku" : "Start a new search"}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{fi ? "Valitse tarvittaessa, mihin tallennetun Myyntiprofiilin osaan tämä haku kohdistuu." : "Choose which part of your saved Sales profile this search should focus on."}</p>
      </div>

      <input type="hidden" name="provider" value="prh-ytj" />
      <input type="hidden" name="companySize" value={profile.companySize} />
      <input type="hidden" name="keywords" value={profile.signals.join(", ")} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-slate-200">{fi ? "Kohdetoimiala" : "Target industry"}</div>
          {profile.industries.length > 1 ? (
            <select name="industry" defaultValue={profile.industries[0]} className={`mt-2 ${inputClass}`}>
              {profile.industries.map((industry) => <option key={industry} value={industry} className="bg-slate-950 text-slate-100">{industry}</option>)}
            </select>
          ) : (
            <>
              <input type="hidden" name="industry" value={profile.industries[0] ?? ""} />
              <div className="mt-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm text-slate-200">{profile.industries[0] || (fi ? "Ei toimialarajausta" : "No industry restriction")}</div>
            </>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-slate-200">{fi ? "Kohdealue" : "Target region"}</div>
          {allFinland ? (
            <>
              <input type="hidden" name="location" value="" />
              <div className="mt-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm text-slate-200">{fi ? "Koko Suomi" : "All Finland"}</div>
            </>
          ) : customRegions.length > 1 ? (
            <select name="location" defaultValue={customRegions[0]} className={`mt-2 ${inputClass}`}>
              {customRegions.map((region) => <option key={region} value={region} className="bg-slate-950 text-slate-100">{region}</option>)}
            </select>
          ) : (
            <>
              <input type="hidden" name="location" value={customRegions[0] ?? ""} />
              <div className="mt-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm text-slate-200">{customRegions[0] || (fi ? "Aluetta ei ole määritetty" : "Region not defined")}</div>
            </>
          )}
        </div>
      </div>

      {!canSearch ? <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
        {fi ? "Lisää Myyntiprofiiliin vähintään yksi kohdetoimiala tai tarkempi alue. Muuten haku olisi liian yleinen eikä LeadFlow voisi löytää laadukkaita liidejä." : "Add at least one target industry or a more specific region to your Sales profile. Otherwise the search would be too broad to produce quality leads."}
      </div> : null}

      {discovery.error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{discovery.error}</div> : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{fi ? "Hakutulokset avautuvat tarkistettaviksi ennen kuin mitään lisätään liideihin." : "Results open for review before anything is added to your leads."}</p>
        <button disabled={finding || !canSearch} className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">{finding ? (fi ? "Etsitään..." : "Finding leads...") : (fi ? "Etsi sopivia yrityksiä" : "Find matching companies")}</button>
      </div>
    </form>
  </div>;
}
