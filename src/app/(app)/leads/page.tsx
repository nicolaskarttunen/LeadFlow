import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { workspace } = await requireWorkspace();
  const query = (await searchParams).q?.trim() ?? "";
  const leads = await prisma.lead.findMany({
    where: {
      workspaceId: workspace.id,
      ...(query ? { OR: [
        { companyName: { contains: query, mode: "insensitive" } },
        { domain: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
        { contacts: { some: { email: { contains: query, mode: "insensitive" } } } },
      ] } : {}),
    },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Prospect pipeline</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Leads</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Keep prospect information, contacts and qualification status in one place.</p>
        </div>
        <Link href="/leads/new" className="rounded-xl bg-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400">+ Add lead</Link>
      </div>

      <form className="mt-7">
        <div className="relative max-w-2xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
          <input name="q" defaultValue={query} placeholder="Search leads..." className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.035] py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-violet-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-violet-500/[0.08]" />
        </div>
      </form>

      <div className="surface mt-5 overflow-hidden rounded-3xl">
        {leads.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="font-semibold text-slate-100">{query ? "No matching leads" : "No leads yet"}</div>
            <p className="mt-2 text-sm text-slate-400">{query ? "Try a broader search term." : "Add your first prospect to start building your pipeline."}</p>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_110px] border-b border-white/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 md:grid">
              <span>Company</span><span>Contact</span><span>Details</span><span>Status / score</span>
            </div>
            <div className="divide-y divide-white/[0.07]">
              {leads.map((lead) => {
                const contact = lead.contacts[0];
                const score = lead.scores[0];
                return (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.035] md:grid-cols-[1.3fr_1fr_1fr_110px]">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{lead.companyName}</div>
                      <div className="mt-1 truncate text-xs text-slate-400">{lead.domain ?? "Domain not added"}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-200">{contact?.name ?? "Contact not added"}</div>
                      <div className="mt-1 truncate text-xs text-slate-400">{contact?.email ?? "Email not added"}</div>
                    </div>
                    <div className="text-sm text-slate-300">{lead.industry ?? "Industry not specified"}<div className="mt-1 text-xs text-slate-400">{lead.location ?? "Location not specified"}</div></div>
                    <div className="self-center text-sm font-medium text-slate-300">{score ? `${score.total}/100` : lead.status.replaceAll("_", " ")}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
