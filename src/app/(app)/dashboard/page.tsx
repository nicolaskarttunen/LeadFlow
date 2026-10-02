import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspace();
  const [currentUser, totalLeads, newLeads, qualifiedLeads, reviewDrafts, replies, recentLeads] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } }),
    prisma.lead.count({ where: { workspaceId: workspace.id } }),
    prisma.lead.count({ where: { workspaceId: workspace.id, status: "NEW" } }),
    prisma.lead.count({ where: { workspaceId: workspace.id, status: "QUALIFIED" } }),
    prisma.emailDraft.count({ where: { workspaceId: workspace.id, status: "NEEDS_REVIEW" } }),
    prisma.reply.count({ where: { workspaceId: workspace.id } }),
    prisma.lead.findMany({ where: { workspaceId: workspace.id }, include: { contacts: { where: { isPrimary: true }, take: 1 }, scores: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const fi = currentUser?.locale !== "en";
  const t = fi ? {
    eyebrow:"Yleiskatsaus", title:"Myynnin tilanne", intro:"Seuraa uusia liidejä, prospektoinnin etenemistä ja viimeisimpiä asiakkaita yhdestä paikasta.", find:"Etsi liidejä",
    waiting:`${newLeads} uutta liidiä odottaa`, waitingHint:"Avaa uudet prospektit, tutkimustila ja pisteet.", open:"Avaa →",
    total:"Liidejä", totalHint:"Prospektit tässä työtilassa", qualified:"Hyväksytyt", qualifiedHint:"Valmiina seuraavaan vaiheeseen", review:"Tarkistettavat", reviewHint:"Luonnokset odottavat hyväksyntää", replies:"Vastaukset", repliesHint:"Saadut vastaukset",
    recent:"Viimeisimmät liidit", recentHint:"Uusimmat prospektit ja niiden nykyiset pisteet.", all:"Näytä kaikki →", empty:"Liidilista on tyhjä", emptyHint:"Etsi ensimmäiset prospektit ja aloita myyntiputken rakentaminen.", first:"Etsi ensimmäiset liidit",
    company:"Yritys", industry:"Toimiala", score:"Pisteet", noContact:"Yhteystietoa ei lisätty", unspecified:"Ei määritetty", notScored:"Ei pisteytetty"
  } : {
    eyebrow:"Overview", title:"Sales overview", intro:"Track new leads, prospecting progress and recent prospects in one place.", find:"Find leads",
    waiting:`${newLeads} new leads waiting`, waitingHint:"Review new prospects, research status and scores.", open:"Open →",
    total:"Leads", totalHint:"Prospects in this workspace", qualified:"Qualified", qualifiedHint:"Ready for the next step", review:"Needs review", reviewHint:"Drafts waiting for approval", replies:"Replies", repliesHint:"Responses received",
    recent:"Recent leads", recentHint:"Your latest prospects and their current score.", all:"View all →", empty:"Your pipeline is empty", emptyHint:"Find your first prospects to start building a focused sales pipeline.", first:"Find first leads",
    company:"Company", industry:"Industry", score:"Score", noContact:"Contact not added", unspecified:"Not specified", notScored:"Not scored"
  };

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{t.eyebrow}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t.title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{t.intro}</p></div><Link href="/leads/discover" className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400">{t.find}</Link></div>
    {newLeads > 0 && <Link href="/leads/newly-found" className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] px-5 py-4 transition hover:bg-violet-400/[0.11]"><div><div className="text-sm font-semibold text-violet-100">{t.waiting}</div><div className="mt-1 text-xs text-slate-400">{t.waitingHint}</div></div><span className="text-sm font-semibold text-violet-300">{t.open}</span></Link>}
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={t.total} value={totalLeads} hint={t.totalHint}/><StatCard label={t.qualified} value={qualifiedLeads} hint={t.qualifiedHint}/><StatCard label={t.review} value={reviewDrafts} hint={t.reviewHint}/><StatCard label={t.replies} value={replies} hint={t.repliesHint}/></section>
    <section className="surface mt-8 overflow-hidden rounded-3xl"><div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-6"><div><h2 className="font-semibold text-white">{t.recent}</h2><p className="mt-1 text-xs text-slate-400">{t.recentHint}</p></div>{recentLeads.length > 0 && <Link href="/leads" className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 transition hover:bg-violet-400/10 hover:text-violet-200">{t.all}</Link>}</div>
    {recentLeads.length === 0 ? <div className="px-5 py-16 text-center"><div className="text-sm font-semibold text-slate-100">{t.empty}</div><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">{t.emptyHint}</p><Link href="/leads/discover" className="mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white">{t.first}</Link></div> : <div><div className="hidden grid-cols-[1fr_180px_110px] border-b border-white/[0.06] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:grid"><span>{t.company}</span><span>{t.industry}</span><span>{t.score}</span></div><div className="divide-y divide-white/[0.07]">{recentLeads.map((lead)=>{const contact=lead.contacts[0],score=lead.scores[0];return <Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[1fr_180px_110px] sm:px-6"><div className="min-w-0"><div className="truncate font-medium text-slate-100">{lead.companyName}</div><div className="mt-1 truncate text-xs text-slate-400">{contact?.email ?? lead.domain ?? t.noContact}</div></div><div className="self-center text-sm text-slate-300">{lead.industry ?? t.unspecified}</div><div className="self-center text-sm font-medium text-slate-300">{score ? `${score.total}/100` : t.notScored}</div></Link>})}</div></div>}</section>
  </div>;
}
