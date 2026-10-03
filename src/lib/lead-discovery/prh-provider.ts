import type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";

type DescriptionEntry = { languageCode?: string; description?: string | null };
type PrhCompany = {
  businessId?: { value?: string };
  names?: Array<{ name?: string; version?: number; endDate?: string | null }>;
  mainBusinessLine?: { type?: string; descriptions?: DescriptionEntry[] };
  website?: { url?: string };
  addresses?: Array<{ type?: number; street?: string | null; postCode?: string | null; postOffices?: Array<{ city?: string; languageCode?: string }> }>;
  endDate?: string | null;
};
type PrhResponse = { companies?: PrhCompany[] };

function description(entries?: DescriptionEntry[]) {
  return entries?.find((item) => item.languageCode === "1")?.description
    ?? entries?.find((item) => item.languageCode === "3")?.description
    ?? entries?.find((item) => item.description)?.description
    ?? undefined;
}
function companyName(company: PrhCompany) {
  return company.names?.find((item) => item.version === 1 && !item.endDate)?.name
    ?? company.names?.find((item) => !item.endDate)?.name
    ?? company.names?.[0]?.name;
}
function companyLocation(company: PrhCompany) {
  const address = company.addresses?.find((item) => item.type === 1) ?? company.addresses?.[0];
  if (!address) return undefined;
  const city = address.postOffices?.find((item) => item.languageCode === "1")?.city
    ?? address.postOffices?.[0]?.city;
  return [address.street, address.postCode, city].filter(Boolean).join(", ") || undefined;
}

export class PrhLeadDiscoveryProvider implements LeadDiscoveryProvider {
  name = "prh-ytj";

  async discover(query: LeadDiscoveryQuery): Promise<DiscoveredLead[]> {
    const params = new URLSearchParams();
    if (query.location) params.set("location", query.location);
    if (query.industry) params.set("mainBusinessLine", query.industry);

    const response = await fetch(`https://avoindata.prh.fi/opendata-ytj-api/v3/companies?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("PRH/YTJ discovery failed", response.status, details);
      throw new Error("PRH/YTJ company discovery returned an error.");
    }

    const data = (await response.json()) as PrhResponse;
    return (data.companies ?? [])
      .filter((company) => !company.endDate && companyName(company) && company.businessId?.value)
      .slice(0, Math.max(1, Math.min(query.limit, 100)))
      .map((company) => {
        const name = companyName(company)!;
        const industry = description(company.mainBusinessLine?.descriptions) ?? query.industry;
        const website = company.website?.url || undefined;
        return {
          provider: this.name,
          providerPlaceId: company.businessId!.value!,
          companyName: name,
          website,
          domain: website,
          industry,
          location: companyLocation(company) ?? query.location,
          description: `PRH/YTJ Y-tunnus: ${company.businessId!.value!}.`,
          whyRelevant: `Vastaa PRH/YTJ-haun ehtoja: ${[query.industry, query.location].filter(Boolean).join(", ") || "valitut hakuehdot"}.`,
          potentialService: query.keywords?.length ? query.keywords.join(", ") : undefined,
        };
      });
  }
}
