export type LeadDiscoveryQuery = {
  industry?: string;
  location?: string;
  companySize?: string;
  keywords?: string[];
  limit: number;
};

export type DiscoveredLead = {
  provider?: string;
  providerPlaceId?: string;
  companyName: string;
  domain?: string;
  website?: string;
  industry?: string;
  location?: string;
  companySize?: string;
  description?: string;
  whyRelevant?: string;
  potentialService?: string;
  registrationDate?: string;
  companyForm?: string;
  discoveryScore?: number;
  discoveryReasons?: string[];
  websiteStatus?: "FOUND" | "MISSING" | "UNKNOWN";
  googlePlaceId?: string;
  googleMatchName?: string;
};

export interface LeadDiscoveryProvider {
  name: string;
  discover(query: LeadDiscoveryQuery): Promise<DiscoveredLead[]>;
}
