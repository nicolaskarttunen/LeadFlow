import Link from "next/link";
import { DiscoveryResults } from "@/components/discovery-results";
import { getCurrentLocale } from "@/lib/current-locale";

export default async function DiscoveryResultsPage() {
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  return <div className="mx-auto max-w-5xl">
    <Link href="/leads/discover" className="text-sm text-slate-400 transition hover:text-white">← {fi ? "Takaisin hakuun" : "Back to search"}</Link>
    <div className="mt-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Liidien etsintä" : "Lead discovery"}</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Hakutulokset" : "Search results"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{fi ? "Tarkista löydetyt yritykset ja valitse, mitkä haluat LeadFlow'n analysoitavaksi." : "Review the companies and choose which ones LeadFlow should analyze."}</p>
    </div>
    <div className="mt-7"><DiscoveryResults locale={locale}/></div>
  </div>;
}
