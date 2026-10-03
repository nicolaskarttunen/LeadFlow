import { GooglePlacesLeadDiscoveryProvider } from "./google-places-provider";
import { MockLeadDiscoveryProvider } from "./mock-provider";
import { PrhLeadDiscoveryProvider } from "./prh-provider";
import type { LeadDiscoveryProvider } from "./types";

export type LeadDiscoveryProviderName = "prh-ytj" | "google-places";

export function getLeadDiscoveryProvider(preferred?: LeadDiscoveryProviderName): LeadDiscoveryProvider {
  if (preferred === "prh-ytj") return new PrhLeadDiscoveryProvider();
  if (preferred === "google-places" && process.env.GOOGLE_PLACES_API_KEY) return new GooglePlacesLeadDiscoveryProvider();
  return process.env.GOOGLE_PLACES_API_KEY ? new GooglePlacesLeadDiscoveryProvider() : new MockLeadDiscoveryProvider();
}

export type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";
