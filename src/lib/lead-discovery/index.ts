import { MockLeadDiscoveryProvider } from "./mock-provider";
import type { LeadDiscoveryProvider } from "./types";
export function getLeadDiscoveryProvider(): LeadDiscoveryProvider { return new MockLeadDiscoveryProvider(); }
export type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";
