import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function NewlyFoundLeadsPage() {
  const { workspace } = await requireWorkspace();
  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id, status: "NEW" },
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      researchRecords: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
      websiteAudits: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { discoveredAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Prospektointi</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Uudet liidit</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Uusimmat löydetyt yritykset. LeadFlow näyttää tutkimuksen, pisteet ja tärkeimmät havainnot heti kun automaattinen analyysi on valmis.</p>
        </div>
        <Link href="/leads/discover" className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-violet-400">Etsi uusia liidejä</Link>
      </div>

      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] px-4 py-3">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-violet-400/10 text-sm font-semibold text-violet-200">{leads.length}</span>
        <div><div className="text-sm font-medium text-slate-100">Uutta liidiä odottaa</div><div className="text-xs text-slate-500">Järjestetty uusimmasta vanhimpaan.</div></div>
      </div>

      <div className="mt-5 grid gap-4">
        {leads.length === 0 ? (
          <div className="surface rounded-3xl px-6 py-16 text-center"><div className="font-semibold">Ei uusia liidejä juuri nyt</div><p className="mt-2 text-sm text-slate-400">Uudet prospektit ilmestyvät tänne löydön ja analyysin jälkeen.</p></div>
        ) : leads.map((lead) => {
          const score = lead.scores[0];
          const research = lead.researchRecords[0];
          const audit = lead.websiteAudits[0];
          return (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="surface grid gap-5 rounded-3xl p-5 transition hover:border-violet-400/25 hover:bg-white/[0.04] md:grid-cols-[1fr_150px_180px] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-slate-100">{lead.companyName}</h2><span className="rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">Uusi</span></div>
                <div className="mt-1 text-xs text-slate-500">{lead.industry ?? "Toimiala ei tiedossa"} · {lead.location ?? "Sijainti ei tiedossa"}</div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{score?.summary ?? lead.whyRelevant ?? "Analyysi odottaa valmistumista."}</p>
              </div>
              <div><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Liidipisteet</div><div className="mt-1 text-2xl font-semibold text-white">{score ? `${score.total}/100` : "—"}</div><div className="mt-1 text-xs text-slate-500">{score?.confidence ? `Varmuus ${score.confidence} %` : "Ei vielä pisteytetty"}</div></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Yritystutkimus</span><span className={research ? "text-emerald-300" : "text-slate-500"}>{research ? "Valmis" : "Odottaa"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Verkkosivu</span><span className={audit ? "text-emerald-300" : "text-slate-500"}>{audit ? "Analysoitu" : lead.website ? "Odottaa" : "Ei löytynyt"}</span></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
