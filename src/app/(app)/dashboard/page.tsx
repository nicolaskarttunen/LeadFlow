import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const [totalLeads, qualifiedLeads, reviewDrafts, replies, recentLeads] = await Promise.all([
    prisma.lead.count({ where: { workspaceId: workspace.id } }),
    prisma.lead.count({ where: { workspaceId: workspace.id, status: "QUALIFIED" } }),
    prisma.emailDraft.count({ where: { workspaceId: workspace.id, status: "NEEDS_REVIEW" } }),
    prisma.reply.count({ where: { workspaceId: workspace.id } }),
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
        scores: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Workspace overview</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Your outreach at a glance</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Review your pipeline, qualification progress and recent prospect activity.</p>
        </div>
        <Link href="/leads/new" className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400">+ Add lead</Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={totalLeads} hint="Prospects in this workspace" />
        <StatCard label="Qualified" value={qualifiedLeads} hint="Ready for the next step" />
        <StatCard label="Needs review" value={reviewDrafts} hint="Drafts waiting for approval" />
        <StatCard label="Replies" value={replies} hint="Responses received" />
      </section>

      <section className="surface mt-8 overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-semibold text-white">Recent leads</h2>
            <p className="mt-1 text-xs text-slate-400">Your latest prospects and their current score.</p>
          </div>
          <Link href="/leads" className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 transition hover:bg-violet-400/10 hover:text-violet-200">View all →</Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm font-semibold text-slate-100">Your pipeline is empty</div>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">Add your first prospect to start building a focused outreach pipeline.</p>
            <Link href="/leads/new" className="mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400">Add first lead</Link>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[1fr_180px_110px] border-b border-white/[0.06] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:grid">
              <span>Company</span><span>Industry</span><span>Score</span>
            </div>
            <div className="divide-y divide-white/[0.07]">
              {recentLeads.map((lead) => {
                const contact = lead.contacts[0];
                const score = lead.scores[0];
                return (
                  <Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[1fr_180px_110px] sm:px-6">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{lead.companyName}</div>
                      <div className="mt-1 truncate text-xs text-slate-400">{contact?.email ?? lead.domain ?? "Contact not added"}</div>
                    </div>
                    <div className="self-center text-sm text-slate-300">{lead.industry ?? "Not specified"}</div>
                    <div className="self-center text-sm font-medium text-slate-300">{score ? `${score.total}/100` : "Not scored"}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
