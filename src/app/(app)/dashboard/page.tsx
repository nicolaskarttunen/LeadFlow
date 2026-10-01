import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();

  const [
    totalLeads,
    qualifiedLeads,
    reviewDrafts,
    replies,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count({
      where: { workspaceId: workspace.id },
    }),
    prisma.lead.count({
      where: {
        workspaceId: workspace.id,
        status: "QUALIFIED",
      },
    }),
    prisma.emailDraft.count({
      where: {
        workspaceId: workspace.id,
        status: "NEEDS_REVIEW",
      },
    }),
    prisma.reply.count({
      where: { workspaceId: workspace.id },
    }),
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
        scores: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-sm font-medium text-violet-300">Overview</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Foundation metrics are live from your workspace database.
          </p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
        >
          Add lead
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads" value={totalLeads} hint="Workspace total" />
        <StatCard
          label="Qualified"
          value={qualifiedLeads}
          hint="Manual or future scoring workflow"
        />
        <StatCard
          label="Waiting approval"
          value={reviewDrafts}
          hint="Email generation comes later"
        />
        <StatCard label="Replies" value={replies} hint="Inbox layer comes later" />
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-semibold">Recent leads</h2>
            <p className="mt-1 text-xs text-slate-500">
              Every row is scoped to {workspace.name}.
            </p>
          </div>
          <Link href="/leads" className="text-sm text-violet-300">
            View all
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="text-sm font-medium text-slate-200">No leads yet</div>
            <p className="mt-2 text-sm text-slate-500">
              Add your first real prospect manually.
            </p>
            <Link
              href="/leads/new"
              className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm"
            >
              Create lead
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {recentLeads.map((lead) => {
              const contact = lead.contacts[0];
              const score = lead.scores[0];

              return (
                <Link
                  href={`/leads/${lead.id}`}
                  key={lead.id}
                  className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1fr_180px_100px]"
                >
                  <div>
                    <div className="font-medium">{lead.companyName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {contact?.email ?? lead.domain ?? "No contact yet"}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">
                    {lead.industry ?? "Industry unknown"}
                  </div>
                  <div className="text-sm text-slate-400">
                    {score ? `${score.total}/100` : "Unscored"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
