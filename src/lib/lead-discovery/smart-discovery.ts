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
    whyRelevant: lead.whyRelevant
      ? `${context} ${lead.whyRelevant}`
      : context,
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
  if (provider.name !== "prh-ytj" || query.industry) {
    return provider.discover(query);
  }

  const lanes = (await generateSearchLanes(profile)).slice(0, MAX_LANES);
  if (!lanes.length) {
    return provider.discover(query);
  }

  const combined: DiscoveredLead[] = [];

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
          return found.map((lead) => withLaneContext(lead, lane.industry, lane.reason));
        } catch (error) {
          console.error("PRH search lane failed", { lane: lane.industry, error });
          return [] as DiscoveredLead[];
        }
      }),
    );

    for (const laneResults of results) mergeUnique(combined, laneResults);
  }

  // If PRH text matching produced too few candidates from the generated lanes,
  // add a limited broad fallback instead of returning an artificially tiny pool.
  if (combined.length < 120) {
    try {
      const broad = await provider.discover({
        ...query,
        industry: undefined,
        limit: BROAD_FALLBACK_LIMIT,
      });
      mergeUnique(combined, broad);
    } catch (error) {
      console.error("Broad PRH fallback discovery failed", error);
    }
  }

  return combined.slice(0, MAX_COMBINED_CANDIDATES);
}
