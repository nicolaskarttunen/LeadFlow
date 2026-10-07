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

export async function rerankCandidatesWithAI(
  leads: DiscoveredLead[],
  profile: SalesProfileForAI,
): Promise<DiscoveredLead[]> {
  if (!process.env.OPENAI_API_KEY || leads.length < 2) return leads;

  const pool = leads.slice(0, 50);
  const candidates = pool.map((lead) => ({
    id: candidateId(lead),
    name: lead.companyName,
    industry: lead.industry ?? null,
    companyForm: lead.companyForm ?? null,
    location: lead.location ?? null,
    registrationDate: lead.registrationDate ?? null,
  }));

  const client = new OpenAI();
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
Return one result for every supplied candidate id.`,
      input: JSON.stringify({ salesProfile: profile, candidates }),
      max_output_tokens: 3000,
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

    if (!byId.size) return leads;

    const rankedPool = pool
      .map((lead) => {
        const ai = byId.get(candidateId(lead));
        return ai
          ? { ...lead, profileFitScore: ai.score, profileFitReason: ai.reason || undefined }
          : lead;
      })
      .sort((a, b) => (b.profileFitScore ?? 0) - (a.profileFitScore ?? 0));

    return [...rankedPool, ...leads.slice(pool.length)];
  } catch (error) {
    console.error("AI candidate reranking failed", error);
    return leads;
  }
}
