export type LeadDiscoveryQuery = {
  industry?: string;
  location?: string;
  companySize?: string;
  keywords?: string[];
  limit: number;
};

export type BuyingSignalConfidence = "HIGH" | "MEDIUM";

export type BuyingSignal = {
  key: string;
  label: string;
  evidence: string;
  confidence: BuyingSignalConfidence;
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
  profileFitScore?: number;
  profileFitReason?: string;
  websiteStatus?: "FOUND" | "MISSING" | "UNKNOWN";
  websiteResearchStatus?: "ANALYZED" | "NO_WEBSITE_LISTED" | "UNVERIFIED";
  buyingSignals?: BuyingSignal[];
  buyingSignalSummary?: string;
  recommendedAngle?: string;
  googlePlaceId?: string;
  googleMatchName?: string;
};

export interface LeadDiscoveryProvider {
  name: string;
  discover(query: LeadDiscoveryQuery): Promise<DiscoveredLead[]>;
}
