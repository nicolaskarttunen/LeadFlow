import OpenAI from "openai";
import type { DiscoveredLead } from "./types";

type SalesProfileForAI = {
  offering?: string | null;
  targetCustomer?: string | null;
  industries: string[];
  keywords: string[];
  excludedIndustries: string[];
  excludedCompanies: string[];
};

type AIResult = {
  id?: string;
  score?: number;
  reason?: string;
};

type AIResponse = { results?: AIResult[] };

const AI_BATCH_SIZE = 30;
const TARGET_STRONG_CANDIDATES = 10;
const BROAD_SEARCH_MINIMUM_FIT = 70;
const TARGETED_SEARCH_MINIMUM_FIT = 35;

function cleanJson(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function candidateId(lead: DiscoveredLead) {
  return lead.providerPlaceId ?? lead.companyName;
}

function failedEvaluation(lead: DiscoveredLead, reason: string): DiscoveredLead {
  return {
    ...lead,
    profileFitScore: 0,
    profileFitReason: reason,
  };
}

function minimumFit(profile: SalesProfileForAI) {
  return profile.industries.length === 0
    ? BROAD_SEARCH_MINIMUM_FIT
    : TARGETED_SEARCH_MINIMUM_FIT;
}

async function evaluateBatch(
  client: OpenAI,
  batch: DiscoveredLead[],
  profile: SalesProfileForAI,
): Promise<DiscoveredLead[]> {
  const candidates = batch.map((lead) => ({
    id: candidateId(lead),
    name: lead.companyName,
    industry: lead.industry ?? null,
    companyForm: lead.companyForm ?? null,
    location: lead.location ?? null,
    registrationDate: lead.registrationDate ?? null,
  }));

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol",
      instructions: `You are LeadFlow's B2B prospect-fit evaluator.
Your only task is to judge how well each candidate company fits the customer's saved Sales Profile.
Use only the supplied profile and official candidate metadata. Do not invent facts.
Desired buying signals are things LeadFlow hopes to verify later; they are NOT observed facts at this stage.
Do not assume a company has no website just because PRH/YTJ did not provide one.
Foreign branches, filial companies, passive holding/investment/property vehicles and obviously mismatched industries should score low unless the Sales Profile explicitly targets them.
Treat the Sales Profile's target customer description as a real fit requirement, not a vague preference.
If the target customer explicitly describes service businesses, then agriculture, farming, primary production, manufacturing-only companies, passive investment/property companies and other clearly non-service businesses should normally score 0-40 unless the profile explicitly includes them.
If the target customer is a service business, favor active customer-facing or B2B service businesses that plausibly buy the offered service.
A candidate should score 70 or more only when there is a clear, defensible fit with the saved Sales Profile from the supplied metadata.
Score fit from 0 to 100: 90-100 ideal, 70-89 strong, 50-69 plausible but uncertain, below 50 weak or mismatched.
Return ONLY valid JSON in this exact shape: {"results":[{"id":"candidate id","score":0,"reason":"short reason in Finnish"}]}.
You MUST return exactly one result for every supplied candidate id. Do not omit any candidate.`,
      input: JSON.stringify({ salesProfile: profile, candidates }),
      max_output_tokens: 3600,
      store: false,
    });

    const parsed = JSON.parse(cleanJson(response.output_text)) as AIResponse;
    const byId = new Map(
      (parsed.results ?? [])
        .filter((item) => item.id && Number.isFinite(Number(item.score)))
        .map((item) => [
          item.id!,
          {
            score: Math.max(0, Math.min(100, Math.round(Number(item.score)))),
            reason: String(item.reason ?? "").trim().slice(0, 240),
          },
        ]),
    );

    return batch.map((lead) => {
      const ai = byId.get(candidateId(lead));
      if (!ai) {
        return failedEvaluation(
          lead,
          "AI ei palauttanut tälle kandidaatille varmennettua profiilisopivuusarviota.",
        );
      }

      return {
        ...lead,
        profileFitScore: ai.score,
        profileFitReason: ai.reason || undefined,
      };
    });
  } catch (error) {
    console.error("AI candidate batch evaluation failed", error);
    return batch.map((lead) => failedEvaluation(lead, "AI-esikarsinta epäonnistui tälle erälle."));
  }
}

export async function rerankCandidatesWithAI(
  leads: DiscoveredLead[],
  profile: SalesProfileForAI,
): Promise<DiscoveredLead[]> {
  if (!leads.length) return [];

  if (!process.env.OPENAI_API_KEY) {
    return leads
      .slice(0, AI_BATCH_SIZE)
      .map((lead) => failedEvaluation(lead, "AI-esikarsinta ei ole käytettävissä."));
  }

  const client = new OpenAI();
  const evaluated: DiscoveredLead[] = [];
  const threshold = minimumFit(profile);
  let strongCount = 0;

  for (let offset = 0; offset < leads.length; offset += AI_BATCH_SIZE) {
    const batch = leads.slice(offset, offset + AI_BATCH_SIZE);
    if (!batch.length) break;

    const batchEvaluated = await evaluateBatch(client, batch, profile);
    evaluated.push(...batchEvaluated);
    strongCount += batchEvaluated.filter(
      (lead) => (lead.profileFitScore ?? 0) >= threshold,
    ).length;

    if (strongCount >= TARGET_STRONG_CANDIDATES) break;
  }

  return evaluated.sort((a, b) => {
    const fitDiff = (b.profileFitScore ?? 0) - (a.profileFitScore ?? 0);
    if (fitDiff !== 0) return fitDiff;
    return (b.discoveryScore ?? 0) - (a.discoveryScore ?? 0);
  });
}
