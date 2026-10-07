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

function safeDraftConfidence(signals: StoredSignal[]) {
  const high = signals.filter((signal) => signal.confidence === "HIGH").length;
  if (high >= 2) return 95;
  if (high === 1) return 88;
  return 72;
}

function explanation(signals: StoredSignal[]) {
  const high = signals.filter((signal) => signal.confidence === "HIGH");
  const medium = signals.filter((signal) => signal.confidence === "MEDIUM");
  const parts: string[] = [];
  if (high.length) parts.push(`Korkean varmuuden havainnot: ${high.map((item) => item.label).join(", ")}.`);
  if (medium.length) parts.push(`Varovasti käytettävät havainnot: ${medium.map((item) => item.label).join(", ")}.`);
  return parts.join(" ");
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

  const signals = readStoredSignals(discoveryAudit?.metadata);
  if (!signals.length) {
    return {
      error: "Tälle liidille ei ole tallennettu varmennettua ostosignaalia. Tee ensin lisätutkimus ennen sähköpostiluonnosta.",
      message: null,
    };
  }

  const highConfidenceSignals = signals.filter((signal) => signal.confidence === "HIGH");
  const mediumConfidenceSignals = signals.filter((signal) => signal.confidence === "MEDIUM");
  const contact = lead.contacts[0];
  const language = salesProfile?.language === "en" ? "English" : "Finnish";

  const facts = {
    targetCompany: {
      name: lead.companyName,
      industry: lead.industry,
      location: lead.location,
      website: lead.website ?? lead.domain,
      contactName: contact?.name ?? null,
    },
    sender: {
      companyName: companyProfile?.companyName ?? null,
      offering: companyProfile?.offering ?? lead.potentialService ?? null,
      description: companyProfile?.description ?? null,
      tone: companyProfile?.emailTone ?? "Professional",
    },
    recommendedAngle: lead.potentialService ?? null,
    highConfidenceSignals,
    mediumConfidenceSignals,
  };

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model: process.env.OPENAI_OUTREACH_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol",
      instructions: `You write concise, human B2B cold-email drafts for LeadFlow.
Write in ${language}.
The email must be grounded ONLY in the supplied facts. Never invent company facts, achievements, problems, people, metrics or website observations.
HIGH confidence signals may be stated as direct observations.
MEDIUM confidence signals are uncertain and MUST be softened, for example "nopeassa tarkistuksessa en huomannut..." or an equivalent natural phrasing. Never present a MEDIUM signal as certain.
Do not insult or criticize the recipient's current website. Be helpful and respectful.
Do not mention LeadFlow, AI, scoring, confidence levels, data providers, scraping, PRH, Google Places or internal research.
Do not claim you performed a full audit. You may say you took a quick look if a website observation is used.
Keep the body roughly 60-120 words, natural and specific, with one simple low-friction question at the end.
Avoid exaggerated sales language, urgency, fake familiarity, and generic compliments.
If a contact name is unavailable, begin simply with "Hei" in Finnish or "Hi" in English.
Use the sender's offering only as supplied.
Return ONLY valid JSON in exactly this shape: {"subject":"...","body":"..."}.`,
      input: JSON.stringify(facts),
      max_output_tokens: 900,
      store: false,
    });

    const parsed = JSON.parse(cleanJson(response.output_text)) as DraftResponse;
    const subject = String(parsed.subject ?? "").trim().slice(0, 180);
    const body = String(parsed.body ?? "").trim().slice(0, 5000);

    if (!subject || !body) {
      return { error: "AI ei palauttanut käyttökelpoista sähköpostiluonnosta. Yritä uudelleen.", message: null };
    }

    const existingDraft = await prisma.emailDraft.findFirst({
      where: {
        workspaceId: workspace.id,
        leadId,
        campaignId: null,
        status: { in: ["DRAFT", "NEEDS_REVIEW"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const draftData = {
      subject,
      body,
      status: "NEEDS_REVIEW" as const,
      personalizationExplanation: explanation(signals),
      factsUsed: {
        highConfidenceSignals,
        mediumConfidenceSignals,
        recommendedAngle: lead.potentialService ?? null,
        offering: companyProfile?.offering ?? lead.potentialService ?? null,
      },
      confidence: safeDraftConfidence(signals),
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
          model: process.env.OPENAI_OUTREACH_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol",
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
