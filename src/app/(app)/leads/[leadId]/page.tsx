import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { deleteLeadAction, researchWebsiteAction, scoreLeadAction } from "@/app/(app)/leads/actions";
import { WebsiteResearchButton } from "@/components/website-research-button";
import { LeadScoreButton } from "@/components/lead-score-button";

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm text-slate-200">{value || "—"}</div>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      workspaceId: workspace.id,
    },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      scores: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      researchRecords: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          evidence: {
            orderBy: { observedAt: "desc" },
            take: 10,
          },
        },
      },
      websiteAudits: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      emailMessages: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!lead) {
    notFound();
  }

  const primaryContact = lead.contacts.find((contact) => contact.isPrimary);
  const latestScore = lead.scores[0];
  const research = lead.researchRecords[0];
  const websiteAudit = lead.websiteAudits[0];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/leads" className="text-sm text-slate-400 hover:text-white">
        ← Back to leads
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="text-sm text-violet-300">{lead.status}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {lead.companyName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {lead.domain ?? lead.website ?? "No website information yet"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {latestScore ? (
            <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2.5 text-sm font-medium text-emerald-200">
              ✓ Analysoitu
            </span>
          ) : research ? (
            <span className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5 text-sm font-medium text-amber-200">
              Analyysi kesken
            </span>
          ) : (
            <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-400">
              Odottaa analyysia
            </span>
          )}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.04]">
              ⋯
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-2xl">
              <form action={deleteLeadAction.bind(null, lead.id)}>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10">
                  Poista liidi
                </button>
              </form>
            </div>
          </details>
        </div>
            ) : (
              <form action={researchLeadAction.bind(null, lead.id)}>
                <ResearchLeadButton />
              </form>
            )
          ) : null}
          <Link
            href={`/leads/${lead.id}/edit`}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium"
          >
            Edit
          </Link>
          <form action={deleteLeadAction.bind(null, lead.id)}>
            <button className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2.5 text-sm font-medium text-red-200">
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">Why contact this company?</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {lead.whyRelevant ||
                "No contact reason has been added yet."}
            </p>
            {lead.potentialService ? (
              <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.06] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-violet-300">
                  Potential service
                </div>
                <div className="mt-2 text-sm">{lead.potentialService}</div>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">Company</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <Detail label="Industry" value={lead.industry} />
              <Detail label="Location" value={lead.location} />
              <Detail label="Company size" value={lead.companySize} />
              <Detail label="Website" value={lead.website} />
            </div>
            {lead.description ? (
              <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                {lead.description}
              </p>
            ) : null}
          </section>

          {lead.website ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Verkkosivuanalyysi</h2>
                  <p className="mt-1 text-xs text-slate-500">Perustuu yrityksen julkisen etusivun havaintoihin.</p>
                </div>
                {websiteAudit ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200">Analyysi valmis</span>
                ) : (
                  <form action={researchWebsiteAction.bind(null, lead.id)}>
                    <WebsiteResearchButton />
                  </form>
                )}
              </div>
              {websiteAudit ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Detail label="HTTPS" value={websiteAudit.httpsEnabled === null ? null : websiteAudit.httpsEnabled ? "Kyllä" : "Ei"} />
                  <Detail label="Sivun otsikko" value={websiteAudit.pageTitle} />
                  <Detail label="H1" value={websiteAudit.h1} />
                  <Detail label="Meta description" value={websiteAudit.metaDescription} />
                  <div className="sm:col-span-2 rounded-xl border border-white/10 p-4 text-sm text-slate-300">{websiteAudit.seoNotes ?? "—"}</div>
                  <div className="sm:col-span-2 rounded-xl border border-white/10 p-4 text-sm text-slate-300">{websiteAudit.ctaNotes ?? "—"}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Research & evidence</h2>
              {research ? (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200">
                  Tutkimus valmis
                </span>
              ) : null}
            </div>
            {!research ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                No research record yet. The next development phase will add the
                evidence-backed research pipeline before any AI email generation.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-slate-300">
                  {research.companySummary ?? "Research record created."}
                </div>
                {research.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm"
                  >
                    <div className="font-medium">{item.type}</div>
                    <div className="mt-1 text-slate-400">{item.description}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">Email history</h2>
            {lead.emailMessages.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No messages yet. Sending remains disabled until the approval and
                suppression layers are implemented.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {lead.emailMessages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-xl border border-white/10 px-4 py-3"
                  >
                    <div className="text-sm font-medium">
                      {message.subject ?? "(No subject)"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {message.status} · {message.toEmail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">Liidipisteet</h2>
            <div className="mt-4 text-4xl font-semibold">
              {latestScore ? `${latestScore.total}/100` : "—"}
            </div>
            {latestScore ? (
              <>
                <div className="mt-2 text-xs text-slate-500">Varmuus {latestScore.confidence ?? "—"} %</div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{latestScore.summary}</p>
                <div className="mt-4 space-y-2">
                  {Object.entries(latestScore.breakdown as Record<string, { score: number; max: number; reason: string }>).map(([key, item]) => (
                    <div key={key} className="rounded-xl border border-white/10 p-3">
                      <div className="flex justify-between gap-3 text-xs"><span className="text-slate-400">{key}</span><span>{item.score}/{item.max}</span></div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : research ? (
              <>
                <p className="mt-2 text-xs leading-5 text-slate-500">Pisteet perustuvat tallennettuihin havaintoihin, eivät mielivaltaiseen AI-arvioon.</p>
                <form action={scoreLeadAction.bind(null, lead.id)}><LeadScoreButton /></form>
              </>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">Tutki yritys ensin, jotta pisteytys voidaan laskea.</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">Primary contact</h2>
            <div className="mt-5 space-y-5">
              <Detail label="Name" value={primaryContact?.name} />
              <Detail label="Job title" value={primaryContact?.jobTitle} />
              <Detail label="Email" value={primaryContact?.email} />
              <Detail
                label="Verification"
                value={primaryContact?.emailVerificationStatus}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">Source</h2>
            <div className="mt-3 text-sm text-slate-400">{lead.source}</div>
            <div className="mt-1 text-xs text-slate-500">
              Discovered {lead.discoveredAt.toLocaleDateString("en-GB")}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
