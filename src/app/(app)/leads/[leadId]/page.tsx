import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { getCurrentLocale } from "@/lib/current-locale";
import { deleteLeadAction, researchWebsiteAction, scoreLeadAction } from "@/app/(app)/leads/actions";
import { WebsiteResearchButton } from "@/components/website-research-button";
import { LeadScoreButton } from "@/components/lead-score-button";
import { EmailDraftGenerator } from "@/components/email-draft-generator";

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
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
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
      emailDrafts: {
        where: { campaignId: null },
        orderBy: { updatedAt: "desc" },
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
  const latestDraft = lead.emailDrafts[0];

  const statusLabel: Record<string, string> = { NEW: fi ? "UUSI" : "NEW", APPROVED: fi ? "HYVÄKSYTTY" : "APPROVED", REVIEW: fi ? "TARKISTETTAVA" : "REVIEW", CONTACTED: fi ? "KONTAKTOITU" : "CONTACTED", REPLIED: fi ? "VASTANNUT" : "REPLIED" };
  const sourceLabel: Record<string, string> = { PROVIDER: fi ? "Hakupalvelu" : "Provider", MANUAL: fi ? "Manuaalinen" : "Manual", CSV: "CSV", MOCK: fi ? "Testidata" : "Mock" };
  const draftStatusLabel: Record<string, string> = {
    DRAFT: fi ? "Luonnos" : "Draft",
    NEEDS_REVIEW: fi ? "Tarkistettava" : "Needs review",
    APPROVED: fi ? "Hyväksytty" : "Approved",
    SCHEDULED: fi ? "Ajastettu" : "Scheduled",
    SENT: fi ? "Lähetetty" : "Sent",
    REPLIED: fi ? "Vastattu" : "Replied",
    PAUSED: fi ? "Tauolla" : "Paused",
    REJECTED: fi ? "Hylätty" : "Rejected",
  };
  const evidenceTypeLabel = (type: string) => fi ? ({ website: "Verkkosivu", phone: "Puhelin", address: "Osoite", industry: "Toimiala", business_id: "Y-tunnus" } as Record<string, string>)[type.toLowerCase()] ?? type : type;
  const decodeDisplayText = (value?: string | null) => value?.replaceAll("&#8211;", "–").replaceAll("&#8212;", "—").replaceAll("&amp;", "&");
  const localizeGeneratedText = (raw?: string | null) => {
    const value = decodeDisplayText(raw);
    if (!value || !fi) return value;
    const matched = value.match(/^Matched Google Places search for (.+) in (.+)\.$/);
    if (matched) return `Vastaa Google Places -hakua: ${matched[1]}, ${matched[2]}.`;
    const listed = value.match(/^Listed business at (.+)\.$/);
    if (listed) return `Yritys on listattu osoitteessa ${listed[1]}.`;
    const confirms = value.match(/^Google Places confirms a website for (.+)\.$/);
    if (confirms) return `Google Places vahvistaa yritykselle ${confirms[1]} verkkosivun.`;
    if (value === "H1 heading was not detected.") return "H1-pääotsikkoa ei havaittu.";
    if (value === "A contact link was detected on the homepage.") return "Etusivulta löytyi yhteydenottolinkki.";
    if (value.startsWith("Business address:")) return value.replace("Business address:", "Yrityksen osoite:");
    if (value.startsWith("Public business phone:")) return value.replace("Public business phone:", "Yrityksen julkinen puhelinnumero:");
    if (value.startsWith("Website:")) return value.replace("Website:", "Verkkosivu:");
    return value;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/leads" className="text-sm text-slate-400 hover:text-white">
        {fi ? "← Takaisin liideihin" : "← Back to leads"}
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="text-sm text-violet-300">{statusLabel[lead.status] ?? lead.status}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {lead.companyName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {lead.domain ?? lead.website ?? (fi ? "Verkkosivua ei ole vielä vahvistettu" : "No website information yet")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {latestScore ? (
            <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2.5 text-sm font-medium text-emerald-200">
              {fi ? "✓ Analysoitu" : "✓ Analyzed"}
            </span>
          ) : research ? (
            <span className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5 text-sm font-medium text-amber-200">
              {fi ? "Analyysi kesken" : "Analysis in progress"}
            </span>
          ) : (
            <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-400">
              {fi ? "Odottaa analyysia" : "Waiting for analysis"}
            </span>
          )}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.04]">
              ⋯
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-2xl">
              <form action={deleteLeadAction.bind(null, lead.id)}>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10">
                  {fi ? "Poista liidi" : "Delete lead"}
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">{fi ? "Miksi tämä yritys?" : "Why this company?"}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {localizeGeneratedText(lead.whyRelevant) ||
                (fi
                  ? "Yritykselle ei ole vielä muodostettu yhteydenoton perustelua."
                  : "No contact reason has been added yet.")}
            </p>
            {lead.potentialService ? (
              <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.06] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-violet-300">
                  {fi ? "Mahdollinen palvelu" : "Potential service"}
                </div>
                <div className="mt-2 text-sm">{lead.potentialService}</div>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">{fi ? "Yritys" : "Company"}</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <Detail label={fi ? "Toimiala" : "Industry"} value={lead.industry} />
              <Detail label={fi ? "Sijainti" : "Location"} value={lead.location} />
              <Detail label={fi ? "Yrityksen koko" : "Company size"} value={lead.companySize} />
              <Detail label={fi ? "Verkkosivu" : "Website"} value={lead.website} />
            </div>
            {lead.description ? (
              <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                {localizeGeneratedText(lead.description)}
              </p>
            ) : null}
          </section>

          {lead.website ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{fi ? "Verkkosivuanalyysi" : "Website analysis"}</h2>
                  <p className="mt-1 text-xs text-slate-500">{fi ? "Perustuu yrityksen julkisen etusivun havaintoihin." : "Based on observations from the company’s public homepage."}</p>
                </div>
                {websiteAudit ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200">{fi ? "Analyysi valmis" : "Analysis complete"}</span>
                ) : (
                  <form action={researchWebsiteAction.bind(null, lead.id)}>
                    <WebsiteResearchButton />
                  </form>
                )}
              </div>
              {websiteAudit ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Detail label="HTTPS" value={websiteAudit.httpsEnabled === null ? null : websiteAudit.httpsEnabled ? "Kyllä" : "Ei"} />
                  <Detail label={fi ? "Sivun otsikko" : "Page title"} value={decodeDisplayText(websiteAudit.pageTitle)} />
                  <Detail label="H1" value={decodeDisplayText(websiteAudit.h1)} />
                  <Detail label={fi ? "Metakuvaus" : "Meta description"} value={decodeDisplayText(websiteAudit.metaDescription)} />
                  <div className="sm:col-span-2 rounded-xl border border-white/10 p-4 text-sm text-slate-300">{localizeGeneratedText(websiteAudit.seoNotes) ?? "—"}</div>
                  <div className="sm:col-span-2 rounded-xl border border-white/10 p-4 text-sm text-slate-300">{localizeGeneratedText(websiteAudit.ctaNotes) ?? "—"}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{fi ? "Tutkimus ja havainnot" : "Research & evidence"}</h2>
              {research ? (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200">
                  {fi ? "Tutkimus valmis" : "Research complete"}
                </span>
              ) : null}
            </div>
            {!research ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">{fi ? "Yritystutkimus odottaa valmistumista." : "Company research is pending."}</p>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-slate-300">
                  {localizeGeneratedText(research.companySummary) ?? (fi ? "Tutkimustiedot tallennettu." : "Research record created.")}
                </div>
                {research.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm"
                  >
                    <div className="font-medium">{evidenceTypeLabel(item.type)}</div>
                    <div className="mt-1 text-slate-400">{localizeGeneratedText(item.description)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-violet-400/15 bg-violet-400/[0.035] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">{fi ? "AI-sähköpostiluonnos" : "AI email draft"}</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                  {fi
                    ? "Luonnos käyttää vain LeadFlow'n tallentamia varmennettuja havaintoja. Sitä ei lähetetä automaattisesti."
                    : "The draft only uses verified findings stored by LeadFlow. It is never sent automatically."}
                </p>
              </div>
              <EmailDraftGenerator leadId={lead.id} hasDraft={Boolean(latestDraft)} locale={locale} />
            </div>

            {latestDraft ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-amber-200">
                    {draftStatusLabel[latestDraft.status] ?? latestDraft.status}
                  </span>
                  {latestDraft.confidence !== null ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300">
                      {fi ? "Luonnoksen varmuus" : "Draft confidence"} {latestDraft.confidence}%
                    </span>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {fi ? "Aihe" : "Subject"}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-100">{latestDraft.subject}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {fi ? "Viesti" : "Message"}
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">{latestDraft.body}</div>
                </div>

                {latestDraft.personalizationExplanation ? (
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
                      {fi ? "Personoinnin peruste" : "Personalization basis"}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{latestDraft.personalizationExplanation}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                {fi
                  ? "Luonnosta ei ole vielä luotu. Luo se vasta, kun yrityksen havainnot näyttävät luotettavilta."
                  : "No draft yet. Generate one after the company findings look reliable."}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">{fi ? "Sähköpostihistoria" : "Email history"}</h2>
            {lead.emailMessages.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {fi ? "Ei lähetettyjä sähköposteja." : "No emails sent yet."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {lead.emailMessages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-xl border border-white/10 px-4 py-3"
                  >
                    <div className="text-sm font-medium">
                      {message.subject ?? (fi ? "(Ei aihetta)" : "(No subject)")}
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
            <h2 className="font-semibold">{fi ? "Liidipisteet" : "Lead score"}</h2>
            <div className="mt-4 text-4xl font-semibold">
              {latestScore ? `${latestScore.total}/100` : "—"}
            </div>
            {latestScore ? (
              <>
                <div className="mt-2 text-xs text-slate-500">{fi ? "Varmuus" : "Confidence"} {latestScore.confidence ?? "—"} %</div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{latestScore.summary}</p>
                <div className="mt-4 space-y-2">
                  {Object.entries(latestScore.breakdown as Record<string, { score: number; max: number; reason: string }>).map(([key, item]) => (
                    <div key={key} className="rounded-xl border border-white/10 p-3">
                      <div className="flex justify-between gap-3 text-xs"><span className="text-slate-400">{({ icpFit: fi ? "Sopivuus" : "ICP fit", evidence: fi ? "Tutkimustiedot" : "Evidence", opportunity: fi ? "Myyntimahdollisuus" : "Opportunity", contactability: fi ? "Tavoitettavuus" : "Contactability" } as Record<string, string>)[key] ?? key}</span><span>{item.score}/{item.max}</span></div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : research ? (
              <>
                <p className="mt-2 text-xs leading-5 text-slate-500">{fi ? "Pisteet perustuvat tallennettuihin havaintoihin." : "The score is based on stored evidence."}</p>
                <form action={scoreLeadAction.bind(null, lead.id)}><LeadScoreButton /></form>
              </>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">{fi ? "Pisteytys muodostuu automaattisesti tutkimuksen valmistuttua." : "Scoring is generated automatically after research is complete."}</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">{fi ? "Ensisijainen yhteyshenkilö" : "Primary contact"}</h2>
            <div className="mt-5 space-y-5">
              <Detail label={fi ? "Nimi" : "Name"} value={primaryContact?.name} />
              <Detail label={fi ? "Tehtävänimike" : "Job title"} value={primaryContact?.jobTitle} />
              <Detail label={fi ? "Sähköposti" : "Email"} value={primaryContact?.email} />
              <Detail
                label={fi ? "Vahvistus" : "Verification"}
                value={primaryContact?.emailVerificationStatus}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="font-semibold">{fi ? "Lähde" : "Source"}</h2>
            <div className="mt-3 text-sm text-slate-400">{sourceLabel[lead.source] ?? lead.source}</div>
            <div className="mt-1 text-xs text-slate-500">
              {fi ? "Löydetty" : "Discovered"} {lead.discoveredAt.toLocaleDateString(fi ? "fi-FI" : "en-GB")}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
