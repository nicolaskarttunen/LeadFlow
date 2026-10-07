import OpenAI from "openai";

type SalesProfileForLanes = {
  offering?: string | null;
  targetCustomer?: string | null;
  industries: string[];
  keywords: string[];
  excludedIndustries: string[];
};

export type SearchLane = {
  industry: string;
  reason?: string;
};

type LaneResponse = {
  lanes?: Array<{ industry?: string; reason?: string }>;
};

const MAX_LANES = 8;

function cleanJson(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeLane(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 100);
}

function uniqueLanes(lanes: SearchLane[]) {
  const seen = new Set<string>();
  return lanes.filter((lane) => {
    const key = lane.industry.toLocaleLowerCase("fi-FI");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackLanes(profile: SalesProfileForLanes): SearchLane[] {
  return uniqueLanes(
    profile.industries
      .map(normalizeLane)
      .filter(Boolean)
      .slice(0, MAX_LANES)
      .map((industry) => ({ industry, reason: "Myyntiprofiilin kohdeala" })),
  );
}

export async function generateSearchLanes(
  profile: SalesProfileForLanes,
): Promise<SearchLane[]> {
  if (!process.env.OPENAI_API_KEY) return fallbackLanes(profile);

  const client = new OpenAI();

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol",
      instructions: `You design search lanes for LeadFlow's Finnish B2B prospect discovery.
Your task is to convert the customer's Sales Profile into 5-8 diverse Finnish business-activity search terms that can be sent to PRH/YTJ's mainBusinessLine filter.

Rules:
- Return business activities / industries, not buying signals, problems, company names or marketing buzzwords.
- The lanes must describe companies that could realistically buy the customer's offering and match the target-customer description.
- Prefer common Finnish industry/activity phrases such as "Ruokaravintolat", "Autokorjaamot", "Kirjanpito- ja tilinpäätöspalvelu" or similarly concrete activities.
- Keep lanes meaningfully different so the candidate pool is diversified.
- Do not invent TOL codes.
- Desired buying signals are NOT industries and must not become lanes.
- Respect excluded industries.
- If the profile explicitly lists target industries, use them as strong guidance but make broad labels more concrete when necessary.
- Return ONLY valid JSON in this exact shape: {"lanes":[{"industry":"Finnish activity term","reason":"short reason in Finnish"}]}.
- Return at most 8 lanes.`,
      input: JSON.stringify({ salesProfile: profile }),
      max_output_tokens: 1200,
      store: false,
    });

    const parsed = JSON.parse(cleanJson(response.output_text)) as LaneResponse;
    const lanes = uniqueLanes(
      (parsed.lanes ?? [])
        .map((lane) => ({
          industry: normalizeLane(String(lane.industry ?? "")),
          reason: String(lane.reason ?? "").trim().slice(0, 180) || undefined,
        }))
        .filter((lane) => lane.industry),
    ).slice(0, MAX_LANES);

    return lanes.length ? lanes : fallbackLanes(profile);
  } catch (error) {
    console.error("Search lane generation failed", error);
    return fallbackLanes(profile);
  }
}
