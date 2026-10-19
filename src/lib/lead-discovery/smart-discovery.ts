import type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";
import { generateSearchLanes } from "./search-lanes";

type SalesProfileForDiscovery = {
  offering?: string | null;
  targetCustomer?: string | null;
  industries: string[];
  keywords: string[];
  excludedIndustries: string[];
};

const MAX_LANES = 8;
const CANDIDATES_PER_LANE = 100;
const BROAD_FALLBACK_LIMIT = 200;
const MAX_COMBINED_CANDIDATES = 800;
const LANE_BATCH_SIZE = 4;

// These are PRH business-line search terms, NOT claimed buying signals.
// They keep broad service-business profiles searchable even without AI.
const SERVICE_SEARCH_TERMS = [
  "siivous", "kirjanpito", "kuljetus", "ravintola",
  "kampaamo", "ohjelmisto", "huolto", "rakennus",
];

const COMMERCE_SEARCH_TERMS = [
  "vähittäiskauppa", "tukkukauppa", "erikoiskauppa", "elintarvikkeiden kauppa",
];

function expansionForIndustry(value: string) {
  const normalized = value.toLocaleLowerCase("fi-FI");
  if (normalized.includes("kauppa") || normalized.includes("retail") || normalized.includes("commerce")) {
    return COMMERCE_SEARCH_TERMS;
  }
  if (isBroadIndustry(value)) return SERVICE_SEARCH_TERMS;
  return [];
}

function isBroadIndustry(value: string) {
  const normalized = value.toLocaleLowerCase("fi-FI");
  return ["palveluyrity", "palveluala", "yritykset", "verkkokauppa", "kauppa &", "kaikki toimialat", "service business"].some(
    (term) => normalized.includes(term),
  );
}

function candidateKey(lead: DiscoveredLead) {
  return lead.providerPlaceId
    ?? lead.domain?.toLowerCase()
    ?? lead.website?.toLowerCase()
    ?? lead.companyName.toLocaleLowerCase("fi-FI");
}

function withLaneContext(lead: DiscoveredLead, industry: string, reason?: string): DiscoveredLead {
  const context = reason
    ? `Hakukaista: ${industry} — ${reason}.`
    : `Hakukaista: ${industry}.`;
  return {
    ...lead,
    whyRelevant: lead.whyRelevant ? `${context} ${lead.whyRelevant}` : context,
  };
}

function mergeUnique(target: DiscoveredLead[], incoming: DiscoveredLead[]) {
  const seen = new Set(target.map(candidateKey));
  for (const lead of incoming) {
    const key = candidateKey(lead);
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(lead);
    if (target.length >= MAX_COMBINED_CANDIDATES) break;
  }
}

export async function discoverSmartCandidates(
  provider: LeadDiscoveryProvider,
  query: LeadDiscoveryQuery,
  profile: SalesProfileForDiscovery,
): Promise<DiscoveredLead[]> {
  if (provider.name !== "prh-ytj") return provider.discover(query);

  // Never use an abstract UI category (e.g. "Palveluyritykset") as the only
  // PRH mainBusinessLine query. Expand it into concrete business activities.
  const generated = await generateSearchLanes(profile);
  const wantedIndustry = query.industry?.trim() ?? "";
  const lanes = [
    ...(!wantedIndustry || isBroadIndustry(wantedIndustry)
      ? []
      : [{ industry: wantedIndustry, reason: "Valittu kohdeala" }]),
    ...generated.filter((lane) => !isBroadIndustry(lane.industry)),
    ...[wantedIndustry, ...profile.industries]
      .flatMap(expansionForIndustry)
      .map((industry) => ({ industry, reason: "Laajan toimialan tarkennettu haku" })),
  ].filter((lane, index, items) =>
    items.findIndex((candidate) => candidate.industry.toLocaleLowerCase("fi-FI") === lane.industry.toLocaleLowerCase("fi-FI")) === index,
  ).slice(0, MAX_LANES);

  const combined: DiscoveredLead[] = [];
  const failures: unknown[] = [];
  let successfulRequests = 0;

  for (let offset = 0; offset < lanes.length && combined.length < MAX_COMBINED_CANDIDATES; offset += LANE_BATCH_SIZE) {
    const batch = lanes.slice(offset, offset + LANE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (lane) => {
        try {
          const found = await provider.discover({
            ...query,
            industry: lane.industry,
            limit: CANDIDATES_PER_LANE,
          });
          successfulRequests += 1;
          return found.map((lead) => withLaneContext(lead, lane.industry, lane.reason));
        } catch (error) {
          failures.push(error);
          console.error("PRH search lane failed", { lane: lane.industry, error });
          return [] as DiscoveredLead[];
        }
      }),
    );

    for (const laneResults of results) mergeUnique(combined, laneResults);
  }

  // PRH business-line text matches may be empty even for real companies.
  // The fallback still respects the user's geographic restriction.
  if (combined.length < 40) {
    try {
      const broad = await provider.discover({
        ...query,
        industry: undefined,
        limit: BROAD_FALLBACK_LIMIT,
      });
      successfulRequests += 1;
      mergeUnique(combined, broad);
    } catch (error) {
      failures.push(error);
      console.error("Broad PRH fallback discovery failed", error);
    }
  }

  // A failed provider must not look like a legitimate zero-results search.
  if (!successfulRequests && failures.length) {
    throw new Error("PRH/YTJ-haku epäonnistui. Tarkista palvelinloki ja yritä uudelleen.");
  }

  return combined.slice(0, MAX_COMBINED_CANDIDATES);
}
