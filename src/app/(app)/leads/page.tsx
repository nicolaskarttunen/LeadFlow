import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const query = (await searchParams).q?.trim() ?? "";

  const leads = await prisma.lead.findMany({
    where: {
      workspaceId: workspace.id,
      ...(query
        ? {
            OR: [
              { companyName: { contains: query, mode: "insensitive" } },
              { domain: { contains: query, mode: "insensitive" } },
              { industry: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
              {
                contacts: {
                  some: {
                    email: { contains: query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-sm font-medium text-violet-300">Prospects</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manual lead management is fully database-backed and tenant-scoped.
          </p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
        >
          Add lead
        </Link>
      </div>

      <form className="mt-7">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search company, domain, industry, location or email..."
          className="w-full max-w-xl rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400/40"
        />
      </form>

      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
        {leads.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="font-medium">
              {query ? "No matching leads" : "No leads yet"}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {query
                ? "Try another search."
                : "Create a manual lead to test the core workflow."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {leads.map((lead) => {
              const contact = lead.contacts[0];
              const score = lead.scores[0];

              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] md:grid-cols-[1.3fr_1fr_1fr_100px]"
                >
                  <div>
                    <div className="font-medium">{lead.companyName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {lead.domain ?? "No domain"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-300">
                      {contact?.name ?? "No contact"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {contact?.email ?? "No email"}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">
                    {lead.industry ?? "Industry unknown"}
                    <div className="mt-1 text-xs text-slate-600">
                      {lead.location ?? "Location unknown"}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">
                    {score ? `${score.total}/100` : lead.status}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
