"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export type EmailDraftActionState = {
  error: string | null;
  message: string | null;
};

type StoredSignal = {
  key: string;
  label: string;
  evidence: string;
  confidence: "HIGH" | "MEDIUM";
};

type DraftResponse = {
  subject?: string;
  body?: string;
  evidenceKey?: string;
};

const initialState: EmailDraftActionState = { error: null, message: null };

function cleanJson(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function readStoredSignals(metadata: unknown): StoredSignal[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const value = metadata as Record<string, unknown>;
  if (!Array.isArray(value.buyingSignals)) return [];

  return value.buyingSignals.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const signal = item as Record<string, unknown>;
    const confidence = signal.confidence === "HIGH" || signal.confidence === "MEDIUM"
      ? signal.confidence
      : null;
    const label = typeof signal.label === "string" ? signal.label.trim() : "";
    const evidence = typeof signal.evidence === "string" ? signal.evidence.trim() : "";
    const key = typeof signal.key === "string" ? signal.key.trim() : label;
    if (!confidence || !label || !evidence) return [];
    return [{ key, label, evidence, confidence } satisfies StoredSignal];
  });
}

// Technical audit findings alone are not a reason to pitch a business. 
// This is a conservative guardrail, not proof that other signals imply demand.
function isTechnicalOnlySignal(signal: StoredSignal) {
  const text = [signal.key, signal.label, signal.evidence].join(" ").toLowerCase();
  return /meta.?description|metakuvaus|meta.?kuvaus|meta.?title|h1(?:\b|_)|otsikkotagi|title.?tag|https|ssl|schema.?markup|robots\.txt|sitemap/.test(text);
}

function explanation(signals: StoredSignal[]) {
  const high = signals.filter((signal) => signal.confidence === "HIGH");
  const medium = signals.filter((signal) => signal.confidence === "MEDIUM");
  const parts: string[] = [];
  if (high.length) parts.push(`Korkean varmuuden havainnot: ${high.map((item) => item.label).join(", ")}.`);
  if (medium.length) parts.push(`Varovasti käytettävät havainnot: ${medium.map((item) => item.label).join(", ")}.`);
  return parts.join(" ");
}

function qualityIssues(subject: string, body: string) {
  const issues: string[] = [];
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words < 38 || words > 125) issues.push("Keep the email concise: about 50-95 words.");
  if (!subject || subject.length > 85) issues.push("Write a concise subject, max 85 characters.");
  if ((body.match(/\?/g) ?? []).length !== 1) issues.push("Include exactly one low-pressure question.");
  if (/\b(?:h1|meta description|metakuvaus|hakutuloksissa|hakutuloksiin|seo audit|konversio-optimointi|käyttäjäpolku)\b/i.test(body)) {
    issues.push("Remove technical marketing jargon; explain a concrete benefit instead.");
  }
  if (/nopeassa tarkistuksessa en huomannut|toteuttaa verkkosivuja, joissa|digitaaliset ratkaisut kasvaville/i.test(body)) {
    issues.push("Rewrite the generic sales wording in an authentic first-person voice.");
  }
  return issues;
}

function appendSignature(body: string, language: string, senderName: string, senderCompany?: string | null) {
  const content = body.trim();
  if (/(?:terveisin|regards|sincerely)\s*,?\s*\n/i.test(content.slice(-180))) return content;
  const parts = [senderName.trim(), senderCompany?.trim()].filter(Boolean);
  if (!parts.length) return content;
  return `${content}\n\n${language === "English" ? "Best regards," : "Ystävällisin terveisin,"}\n${parts.join("\n")}`;
}

export async function generateLeadEmailDraftAction(
  leadId: string,
  _previousState: EmailDraftActionState = initialState,
  _formData: FormData,
): Promise<EmailDraftActionState> {
  const { user, workspace } = await requireWorkspace();

  if (!process.env.OPENAI_API_KEY) {
    return { error: "OpenAI API -avain puuttuu. Sähköpostiluonnosta ei voitu luoda.", message: null };
  }

  const [lead, companyProfile, salesProfile, discoveryAudit] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, workspaceId: workspace.id },
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
        },
        researchRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        websiteAudits: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.companyProfile.findUnique({
      where: { workspaceId: workspace.id },
      select: {
        companyName: true,
        offering: true,
        description: true,
        emailTone: true,
        website: true,
      },
    }),
    prisma.idealCustomerProfile.findFirst({
      where: { workspaceId: workspace.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { language: true },
    }),
    prisma.auditLog.findFirst({
      where: {
        workspaceId: workspace.id,
        entityType: "lead",
        entityId: leadId,
        action: "lead.discovered",
      },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    }),
  ]);

  if (!lead) {
    return { error: "Liidiä ei löytynyt.", message: null };
  }

  const opportunityEvidence = await prisma.researchEvidence.findMany({
    where: { workspaceId: workspace.id, leadId, websiteAuditId: lead?.websiteAudits[0]?.id ?? "__no_audit__", type: "ai_opportunity" },
    orderBy: { observedAt: "desc" },
    take: 5,
    select: { id: true, description: true, sourceUrl: true },
  });
  const opportunities: StoredSignal[] = opportunityEvidence
    .filter((item) => Boolean(item.sourceUrl) && item.description.includes("Lähdekatkelma:"))
    .map((item) => ({
      key: `opportunity:${item.id}`,
      label: "Yrityksen sisältöön perustuva kehitysehdotus",
      evidence: `${item.description} Lähde: ${item.sourceUrl}`,
      confidence: "MEDIUM" as const,
    }));
  const signals = readStoredSignals(discoveryAudit?.metadata);
  if (!signals.length && !opportunities.length) {
    return {
      error: "Tälle liidille ei ole tallennettu varmennettua ostosignaalia. Tee ensin lisätutkimus ennen sähköpostiluonnosta.",
      message: null,
    };
  }

  const relevantSignals = [...opportunities, ...signals.filter((signal) => !isTechnicalOnlySignal(signal))];
  if (!relevantSignals.length) {
    return {
      error: "Tutkimuksessa löytyi vain teknisiä verkkosivuhavaintoja. Ne eivät yksin riitä hyödylliseen myyntiviestiin. Tutki yrityksen palveluita ja asiakkaan asiointia tarkemmin.",
      message: null,
    };
  }

  const highConfidenceSignals = relevantSignals.filter((signal) => signal.confidence === "HIGH");
  const mediumConfidenceSignals = relevantSignals.filter((signal) => signal.confidence === "MEDIUM");
  const contact = lead.contacts[0];
  const language = salesProfile?.language === "en" ? "English" : "Finnish";

  const facts = {
    targetCompany: {
      name: lead.companyName,
      industry: lead.industry,
      location: lead.location,
      website: lead.website ?? lead.domain,
      contactName: contact?.name ?? null,
      homepageTitle: lead.websiteAudits[0]?.pageTitle ?? null,
      homepageHeadline: lead.websiteAudits[0]?.h1 ?? null,
    },
    sender: {
      name: user.name?.trim() ?? "",
      companyName: companyProfile?.companyName ?? null,
      website: companyProfile?.website ?? null,
      offering: companyProfile?.offering ?? null,
      description: companyProfile?.description ?? null,
      tone: companyProfile?.emailTone ?? "Professional",
    },
    recommendedAngle: lead.potentialService ?? null,
    highConfidenceSignals,
    mediumConfidenceSignals,
  };

  try {
    const client = new OpenAI();
    const model = process.env.OPENAI_OUTREACH_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol";
    const eligibleSignals = [...highConfidenceSignals, ...mediumConfidenceSignals];
    let subject = "";
    let body = "";
    let issues: string[] = [];
    let selectedSignal: StoredSignal | undefined;

    // Retry a substandard draft once instead of showing generic first output.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await client.responses.create({
        model,
        instructions: `Write ONE naturally personal B2B outreach email in ${language}, as a helpful small-business owner, not a marketing agency.
Use ONLY the supplied evidence and company profile. Never invent problems, services, numbers, an absent booking feature, or customer behavior. Website observations are not proof of buying intent.
Prefer a well-grounded business opportunity over generic website observations. Choose exactly ONE evidence item from highConfidenceSignals or mediumConfidenceSignals. Base the opening and proposed improvement on that single observation. Never extrapolate an observed missing HTML element into a claim that a customer cannot find a service or cannot contact the business. If the observation has no actionable customer-facing implication, say so by returning an empty subject and body. Never sell isolated metadata, ranking, code or other invisible technical fixes as the sole pitch.
Explain ONE practical improvement and the benefit it might bring, using cautious possibilities rather than unsupported claims.
A MEDIUM-confidence observation is uncertain and MUST be softened, for example "sivua katsoessani en heti löytänyt...", never asserted as a definite absence. HIGH-confidence observations may be presented carefully as facts.
Write naturally in the first person: "Huomasin..." and "Voisin..." instead of "Nicolasdesign toteuttaa...".
Write 50–95 words in 2–3 short paragraphs, beginning "Hei!" in Finnish (or "Hi,"). Finish with exactly ONE low-pressure, easy-to-answer question.
Include only the actual sender service described in sender.offering, and only if it helps the proposed change. If sender.offering is missing or unrelated, do not promise delivery of a service. Don't be pushy. Do not insult the website. No generic compliments, invented familiarity, buzzwords, em dashes, emoji or technical SEO jargon such as H1, meta description and CTA.
Subject: 3–8 words, relevant to this company and specific idea, not clickbait.
Do not repeat the company name or the same benefit needlessly. Do not mention LeadFlow, AI, PRH, Google, confidence scores, data collection or internal research.
Avoid generic phrases "nopeassa tarkistuksessa en huomannut", "voisi auttaa kävijää etenemään", "ilman ylimääräistä etsimistä" and "nykypäivän digitaalisessa maailmassa".
DO NOT write a signature: the app appends the sender's real account name and company.
Return only valid JSON: {"subject":"...","body":"...","evidenceKey":"..."}. evidenceKey MUST exactly equal the key of the single supplied observation used in the email. Never invent an evidenceKey.`,
        input: JSON.stringify({
          ...facts,
          correction: attempt === 0 ? undefined : {
            previousSubject: subject,
            previousBody: body,
            issues,
            requirement: "Rewrite the message to resolve these issues without inventing evidence.",
          },
        }),
        max_output_tokens: 900,
        store: false,
      });

      const parsed = JSON.parse(cleanJson(response.output_text)) as DraftResponse;
      subject = String(parsed.subject ?? "").trim();
      body = String(parsed.body ?? "").trim();
      selectedSignal = eligibleSignals.find((signal) => signal.key === parsed.evidenceKey);
      issues = qualityIssues(subject, body);
      if (!selectedSignal) issues.push("Choose one existing evidenceKey from the supplied signals.");
      if (selectedSignal?.confidence === "MEDIUM" && !/(?:ehkä|mahdollis|saatta|voisi|en heti|en löytänyt|en huomannut|might|may|could|did not immediately)/i.test(body)) {
        issues.push("Phrase the uncertain finding as a possibility, not as a verified problem.");
      }
      if (!issues.length) break;
    }

    if (issues.length) {
      return {
        error: "AI ei onnistunut luomaan riittävän laadukasta viestiä. Tarkista yrityksen havainnot ja kokeile uudelleen.",
        message: null,
      };
    }

    if (!selectedSignal) {
      return { error: "Luonnokselle ei löytynyt todennettua havaintoa.", message: null };
    }

    body = appendSignature(body, language, user.name ?? "", companyProfile?.companyName).slice(0, 5000);

    const existingDraft = await prisma.emailDraft.findFirst({
      where: {
        workspaceId: workspace.id,
        leadId,
        campaignId: null,
        status: { in: ["DRAFT", "NEEDS_REVIEW", "APPROVED"] },
        messages: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const draftData = {
      subject,
      body,
      status: "NEEDS_REVIEW" as const,
      personalizationExplanation: `Käytetty havainto: ${selectedSignal.label}. Peruste: ${selectedSignal.evidence}. Varmuus: ${selectedSignal.confidence}.`,
      factsUsed: {
        selectedSignal,
        recommendedAngle: lead.potentialService ?? null,
        offering: companyProfile?.offering ?? null,
      },
      // This is not a statistically calibrated confidence estimate for prose.
      confidence: null,
    };

    const draft = existingDraft
      ? await prisma.emailDraft.update({ where: { id: existingDraft.id }, data: draftData })
      : await prisma.emailDraft.create({
          data: {
            workspaceId: workspace.id,
            leadId,
            campaignId: null,
            ...draftData,
          },
        });

    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "email_draft.generated",
        entityType: "email_draft",
        entityId: draft.id,
        metadata: {
          leadId,
          highConfidenceSignalCount: highConfidenceSignals.length,
          mediumConfidenceSignalCount: mediumConfidenceSignals.length,
          model,
        },
      },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/dashboard");

    return { error: null, message: "Sähköpostiluonnos luotu tarkistettavaksi." };
  } catch (error) {
    console.error("Email draft generation failed", error);
    return {
      error: "Sähköpostiluonnoksen luonti epäonnistui. Tarkista API-asetukset ja yritä uudelleen.",
      message: null,
    };
  }
}
