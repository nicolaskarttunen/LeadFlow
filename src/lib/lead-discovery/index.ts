import { GooglePlacesLeadDiscoveryProvider } from "./google-places-provider";
import { MockLeadDiscoveryProvider } from "./mock-provider";
import type { LeadDiscoveryProvider } from "./types";

export function getLeadDiscoveryProvider(): LeadDiscoveryProvider {
  return process.env.GOOGLE_PLACES_API_KEY
    ? new GooglePlacesLeadDiscoveryProvider()
    : new MockLeadDiscoveryProvider();
}

export type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";
