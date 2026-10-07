import Link from "next/link";
import prisma from "@/lib/prisma";
import { getCurrentLocale } from "@/lib/current-locale";
import { requireWorkspace } from "@/lib/workspace";
import {
  approveEmailDraftAction,
  markEmailDraftSentAction,
  rejectEmailDraftAction,
} from "@/app/(app)/outreach/actions";

type DraftStatus = "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "SCHEDULED" | "SENT" | "REPLIED" | "PAUSED" | "REJECTED";

const statusPriority: Record<DraftStatus, number> = {
  NEEDS_REVIEW: 0,
  APPROVED: 1,
  SCHEDULED: 2,
  DRAFT: 3,
  SENT: 4,
  REPLIED: 5,
  PAUSED: 6,
  REJECTED: 7,
};

function dateLabel(value: Date | null | undefined, fi: boolean) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(fi ? "fi-FI" : "en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function OutreachPage() {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";

  const [drafts, grouped, suppressions] = await Promise.all([
    prisma.emailDraft.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        lead: {
          select: {
            id: true,
            companyName: true,
            status: true,
            contacts: {
              where: { email: { not: null } },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              select: {
                id: true,
                name: true,
                email: true,
                isPrimary: true,
                emailVerificationStatus: true,
              },
            },
            replies: {
              orderBy: { receivedAt: "desc" },
              take: 1,
              select: { id: true, category: true, receivedAt: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, sentAt: true, toEmail: true },
        },
      },
    }),
    prisma.emailDraft.groupBy({
      by: ["status"],
      where: { workspaceId: workspace.id },
      _count: { _all: true },
    }),
    prisma.suppressionEntry.findMany({
      where: { workspaceId: workspace.id },
      select: { emailNormalized: true },
    }),
  ]);

  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  const suppressed = new Set(suppressions.map((row) => row.emailNormalized));
  const sortedDrafts = [...drafts].sort((a, b) => {
    const aPriority = statusPriority[a.status as DraftStatus] ?? 99;
    const bPriority = statusPriority[b.status as DraftStatus] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const needsReview = counts.get("NEEDS_REVIEW") ?? 0;
  const approved = counts.get("APPROVED") ?? 0;
  const sent = (counts.get("SENT") ?? 0) + (counts.get("REPLIED") ?? 0);
  const replied = counts.get("REPLIED") ?? 0;

  const statusLabel: Record<string, string> = fi
    ? {
        DRAFT: "Luonnos",
        NEEDS_REVIEW: "Tarkistettava",
        APPROVED: "Valmis lähetettäväksi",
        SCHEDULED: "Ajastettu",
        SENT: "Lähetetty",
        REPLIED: "Vastattu",
        PAUSED: "Tauolla",
        REJECTED: "Hylätty",
      }
    : {
        DRAFT: "Draft",
        NEEDS_REVIEW: "Needs review",
        APPROVED: "Ready to send",
        SCHEDULED: "Scheduled",
        SENT: "Sent",
        REPLIED: "Replied",
        PAUSED: "Paused",
        REJECTED: "Rejected",
      };

  const statusClass: Record<string, string> = {
    NEEDS_REVIEW: "border-amber-400/20 bg-amber-400/[0.07] text-amber-200",
    APPROVED: "border-violet-400/20 bg-violet-400/[0.08] text-violet-200",
    SCHEDULED: "border-sky-400/20 bg-sky-400/[0.07] text-sky-200",
    SENT: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200",
    REPLIED: "border-emerald-400/25 bg-emerald-400/[0.1] text-emerald-100",
    DRAFT: "border-white/10 bg-white/[0.04] text-slate-300",
    PAUSED: "border-white/10 bg-white/[0.04] text-slate-400",
    REJECTED: "border-red-400/15 bg-red-400/[0.05] text-red-300",
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
            {fi ? "Myynti" : "Sales"}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {fi ? "Yhteydenotot" : "Outreach"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            {fi
              ? "Tarkista AI-luonnokset, hyväksy lähetettävät viestit ja seuraa, keihin yrityksesi on jo ollut yhteydessä."
              : "Review AI drafts, approve messages and keep track of every company your team has contacted."}
          </p>
        </div>
        <Link
          href="/leads"
          className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07]"
        >
          {fi ? "Avaa liidit" : "Open leads"}
        </Link>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [fi ? "Tarkistettavana" : "Needs review", needsReview, "text-amber-200"],
          [fi ? "Valmiina" : "Ready", approved, "text-violet-200"],
          [fi ? "Kontaktoitu" : "Contacted", sent, "text-emerald-200"],
          [fi ? "Vastannut" : "Replied", replied, "text-emerald-100"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</div>
            <div className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-violet-400/15 bg-violet-400/[0.035] px-5 py-4 text-sm leading-6 text-slate-300">
        <span className="font-semibold text-violet-200">{fi ? "Turvallinen lähetys:" : "Safe sending:"}</span>{" "}
        {fi
          ? "LeadFlow ei lähetä vielä viestejä automaattisesti. Hyväksytty viesti voidaan nyt merkitä lähetetyksi seurannan testaamiseksi. Kun Gmail/Microsoft 365 yhdistetään, sama näkymä lähettää viestin oikeasti asiakkaan omasta sähköpostista."
          : "LeadFlow does not send automatically yet. Approved messages can currently be marked as sent for tracking. Once Gmail/Microsoft 365 is connected, the same workflow will send from the customer's own mailbox."}
      </section>

      <div className="mt-6 space-y-4">
        {sortedDrafts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-200">
              {fi ? "Ei vielä sähköpostiluonnoksia" : "No email drafts yet"}
            </div>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {fi
                ? "Avaa liidi, varmista sen ostosignaalit ja luo AI-sähköpostiluonnos. Se ilmestyy tämän jälkeen tähän tarkistettavaksi."
                : "Open a lead, verify its buying signals and create an AI email draft. It will appear here for review."}
            </p>
            <Link href="/leads" className="mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400">
              {fi ? "Siirry liideihin" : "Go to leads"}
            </Link>
          </div>
        ) : (
          sortedDrafts.map((draft) => {
            const contact = draft.lead.contacts.find((item) => item.email);
            const email = contact?.email ?? null;
            const isSuppressed = email ? suppressed.has(email.trim().toLowerCase()) : false;
            const latestMessage = draft.messages[0];
            const latestReply = draft.lead.replies[0];
            const canApprove = draft.status === "NEEDS_REVIEW" || draft.status === "DRAFT";
            const canMarkSent = draft.status === "APPROVED" && Boolean(email) && !isSuppressed;

            return (
              <article key={draft.id} className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/leads/${draft.lead.id}`} className="text-lg font-semibold text-slate-100 hover:text-violet-200">
                        {draft.lead.companyName}
                      </Link>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClass[draft.status] ?? statusClass.DRAFT}`}>
                        {statusLabel[draft.status] ?? draft.status}
                      </span>
                      {latestReply ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                          {fi ? "Vastaus havaittu" : "Reply recorded"}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span>{fi ? "Vastaanottaja:" : "Recipient:"} {email ?? (fi ? "ei sähköpostia" : "no email")}</span>
                      <span>{fi ? "Päivitetty:" : "Updated:"} {dateLabel(draft.updatedAt, fi)}</span>
                      {latestMessage?.sentAt ? <span>{fi ? "Lähetetty:" : "Sent:"} {dateLabel(latestMessage.sentAt, fi)}</span> : null}
                    </div>

                    {!email ? (
                      <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3.5 py-2.5 text-xs leading-5 text-amber-100">
                        {fi ? "Lähetystä varten liidille tarvitaan ensin sähköpostiosoite." : "An email address is required before this lead can be contacted."}
                      </div>
                    ) : isSuppressed ? (
                      <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3.5 py-2.5 text-xs leading-5 text-red-200">
                        {fi ? "Tämä sähköpostiosoite on estolistalla. Lähetystä ei sallita." : "This email is on the suppression list. Sending is blocked."}
                      </div>
                    ) : null}

                    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {fi ? "Aihe" : "Subject"}
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-slate-200">{draft.subject}</div>
                      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {fi ? "Viesti" : "Message"}
                      </div>
                      <div className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-300">{draft.body}</div>
                    </div>

                    {draft.personalizationExplanation ? (
                      <div className="mt-3 text-xs leading-5 text-slate-500">
                        <span className="font-medium text-slate-400">{fi ? "Personoinnin peruste:" : "Personalization basis:"}</span>{" "}
                        {draft.personalizationExplanation}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 xl:w-52">
                    {canApprove ? (
                      <form action={approveEmailDraftAction.bind(null, draft.id)}>
                        <button className="w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">
                          {fi ? "Hyväksy viesti" : "Approve message"}
                        </button>
                      </form>
                    ) : null}

                    {canMarkSent ? (
                      <form action={markEmailDraftSentAction.bind(null, draft.id)}>
                        <button className="w-full rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.12]">
                          {fi ? "Merkitse lähetetyksi" : "Mark as sent"}
                        </button>
                      </form>
                    ) : null}

                    {canApprove ? (
                      <form action={rejectEmailDraftAction.bind(null, draft.id)}>
                        <button className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200">
                          {fi ? "Hylkää luonnos" : "Reject draft"}
                        </button>
                      </form>
                    ) : null}

                    <Link
                      href={`/leads/${draft.lead.id}`}
                      className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      {fi ? "Avaa liidi" : "Open lead"}
                    </Link>

                    {draft.status === "APPROVED" && !canMarkSent ? (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-center text-xs leading-5 text-slate-500">
                        {!email
                          ? (fi ? "Lisää sähköposti ennen lähetystä" : "Add an email before sending")
                          : (fi ? "Lähetys estetty" : "Sending blocked")}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
