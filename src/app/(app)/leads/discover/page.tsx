import Link from "next/link";
import { DiscoveryForm } from "@/components/discovery-form";
import { getCurrentLocale } from "@/lib/current-locale";

export default async function DiscoverLeadsPage() {
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  return <div className="mx-auto max-w-5xl">
    <Link href="/leads" className="text-sm text-slate-400 transition hover:text-white">← {fi ? "Takaisin liideihin" : "Back to leads"}</Link>
    <div className="mt-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Liidien etsintä" : "Lead discovery"}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Löydä potentiaalisia asiakkaita" : "Find relevant prospects"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{fi ? "Rajaa haku ja tarkista löydetyt yritykset ennen niiden lisäämistä liideihin." : "Define a focused search and review the discovered companies before adding them to your pipeline."}</p></div>
    <div className="mt-7"><DiscoveryForm locale={locale} /></div>
  </div>;
}
