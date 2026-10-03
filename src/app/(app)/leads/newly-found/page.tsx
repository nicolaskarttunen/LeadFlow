import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { getCurrentLocale } from "@/lib/current-locale";
import { keepLeadAction, rejectLeadAction, keepLeadsAboveScoreAction, rejectLeadsBelowScoreAction } from "./actions";
import { ScoreThresholdInput } from "@/components/score-threshold-input";

export default async function NewlyFoundLeadsPage() {
  const { workspace } = await requireWorkspace();
  const fi = (await getCurrentLocale()) === "fi";
  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id, reviewStatus: "PENDING" },
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      researchRecords: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
      websiteAudits: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { discoveredAt: "desc" },
    take: 100,
  });

  leads.sort((a, b) => {
    const aScore = a.scores[0]?.total;
    const bScore = b.scores[0]?.total;
    if (aScore == null && bScore == null) return b.discoveredAt.getTime() - a.discoveredAt.getTime();
    if (aScore == null) return 1;
    if (bScore == null) return -1;
    if (bScore !== aScore) return bScore - aScore;
    return b.discoveredAt.getTime() - a.discoveredAt.getTime();
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Prospektointi" : "Prospecting"}</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Uudet liidit" : "New leads"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{fi ? "Uusimmat löydetyt yritykset. LeadFlow näyttää tutkimuksen, pisteet ja tärkeimmät havainnot heti kun analyysi on valmis." : "The newest discovered companies. LeadFlow shows research, scores and key findings as analysis completes."}</p>
        </div>
        <Link href="/leads/discover" className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-violet-400">{fi ? "Etsi uusia liidejä" : "Find new leads"}</Link>
      </div>

      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] px-4 py-3">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-violet-400/10 text-sm font-semibold text-violet-200">{leads.length}</span>
        <div><div className="text-sm font-medium text-slate-100">{fi ? "Uutta liidiä odottaa" : "New leads waiting"}</div><div className="text-xs text-slate-500">{fi ? "Järjestetty parhaista pisteistä alkaen." : "Sorted by highest score first."}</div></div>
      </div>

      <details className="group mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.025]">
          <div>
            <span>{fi ? "Käsittele liidejä" : "Review leads"}</span>
            <span className="ml-3 text-xs font-normal text-slate-500">{fi ? "Valitse liidit pisteiden perusteella" : "Select leads by score"}</span>
          </div>
          <span className="text-slate-500 transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-white/[0.07] px-4 py-4">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">{fi ? "Anna pisteraja ja valitse, haluatko pitää rajan saavuttavat liidit vai hylätä sen alle jäävät. Mitään ei tehdä automaattisesti." : "Set a score threshold, then choose whether to keep leads meeting it or reject leads below it. Nothing happens automatically."}</p>
          <form className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-400">
              <span className="mb-1 block">{fi ? "Pisteraja" : "Score threshold"}</span>
              <ScoreThresholdInput fi={fi} defaultValue={80} />
            </label>
            <button formAction={keepLeadsAboveScoreAction} className="rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400">{fi ? "Pidä kaikki rajan saavuttavat" : "Keep all meeting threshold"}</button>
            <button formAction={rejectLeadsBelowScoreAction} className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.07]">{fi ? "Hylkää kaikki rajan alle jäävät" : "Reject all below threshold"}</button>
          </form>
          <p className="mt-3 text-[11px] text-slate-600">{fi ? "Pisteyttämättömiä liidejä ei käsitellä massatoiminnoilla." : "Unscored leads are not affected by bulk actions."}</p>
        </div>
      </details>

      <div className="mt-5 grid gap-4">
        {leads.length === 0 ? (
          <div className="surface rounded-3xl px-6 py-16 text-center"><div className="font-semibold">{fi ? "Ei uusia liidejä juuri nyt" : "No new leads right now"}</div><p className="mt-2 text-sm text-slate-400">{fi ? "Uudet prospektit ilmestyvät tänne löydön ja analyysin jälkeen." : "New prospects appear here after discovery and analysis."}</p></div>
        ) : leads.map((lead) => {
          const score = lead.scores[0];
          const research = lead.researchRecords[0];
          const audit = lead.websiteAudits[0];
          return (
            <div key={lead.id} className="surface grid gap-5 rounded-3xl p-5 md:grid-cols-[1fr_150px_180px] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Link href={`/leads/${lead.id}`} className="truncate font-semibold text-slate-100 transition hover:text-violet-300">{lead.companyName}</Link><span className="rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">{fi ? "Uusi" : "New"}</span></div>
                <div className="mt-1 text-xs text-slate-500">{lead.industry ?? (fi ? "Toimiala ei tiedossa" : "Industry unknown")} · {lead.location ?? (fi ? "Sijainti ei tiedossa" : "Location unknown")}</div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{score?.summary ?? lead.whyRelevant ?? (fi ? "Analyysi odottaa valmistumista." : "Analysis is pending.")}</p>
              </div>
              <div><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fi ? "Liidipisteet" : "Lead score"}</div><div className="mt-1 text-2xl font-semibold text-white">{score ? `${score.total}/100` : "—"}</div><div className="mt-1 text-xs text-slate-500">{score?.confidence ? `${fi ? "Varmuus" : "Confidence"} ${score.confidence} %` : (fi ? "Ei vielä pisteytetty" : "Not scored yet")}</div></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-500">{fi ? "Yritystutkimus" : "Company research"}</span><span className={research ? "text-emerald-300" : "text-slate-500"}>{research ? (fi ? "Valmis" : "Complete") : (fi ? "Odottaa" : "Pending")}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">{fi ? "Verkkosivu" : "Website"}</span><span className={audit ? "text-emerald-300" : "text-slate-500"}>{audit ? (fi ? "Analysoitu" : "Analyzed") : lead.website ? (fi ? "Odottaa" : "Pending") : (fi ? "Ei löytynyt" : "Not found")}</span></div>
              <div className="flex gap-2 pt-2"><form action={keepLeadAction}><input type="hidden" name="leadId" value={lead.id}/><button className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-400">{fi ? "Pidä liidi" : "Keep lead"}</button></form><form action={rejectLeadAction}><input type="hidden" name="leadId" value={lead.id}/><button className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white">{fi ? "Hylkää" : "Reject"}</button></form></div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
