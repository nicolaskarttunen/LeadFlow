import type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";

type DescriptionEntry = { languageCode?: string; description?: string | null };
type PrhCompany = {
  businessId?: { value?: string };
  names?: Array<{ name?: string; version?: number; endDate?: string | null }>;
  mainBusinessLine?: { type?: string; descriptions?: DescriptionEntry[] };
  website?: { url?: string };
  companyForms?: Array<{ type?: string; version?: number; endDate?: string | null }>;
  companySituations?: Array<{ type?: string; endDate?: string | null }>;
  addresses?: Array<{ type?: number; street?: string | null; postCode?: string | null; postOffices?: Array<{ city?: string; languageCode?: string }> }>;
  registrationDate?: string | null;
  endDate?: string | null;
};
type PrhResponse = { totalResults?: number; companies?: PrhCompany[] };

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

function companyForm(company: PrhCompany) {
  return company.companyForms?.find((item) => item.version === 1 && !item.endDate)?.type
    ?? company.companyForms?.find((item) => !item.endDate)?.type
    ?? company.companyForms?.[0]?.type;
}

function recentRegistrationStart(keywords: string[] | undefined) {
  const wantsNewCompany = (keywords ?? []).some((keyword) => {
    const value = keyword.toLowerCase();
    return value.includes("uusi yritys") || value.includes("new company");
  });
  if (!wantsNewCompany) return undefined;

  const date = new Date();
  date.setMonth(date.getMonth() - 18);
  return date.toISOString().slice(0, 10);
}

export class PrhLeadDiscoveryProvider implements LeadDiscoveryProvider {
  name = "prh-ytj";

  async discover(query: LeadDiscoveryQuery): Promise<DiscoveredLead[]> {
    const requested = Math.max(1, Math.min(query.limit, 300));
    const pages = Math.max(1, Math.ceil(requested / 100));
    const baseParams = new URLSearchParams();

    if (query.location) baseParams.set("location", query.location);
    if (query.industry) baseParams.set("mainBusinessLine", query.industry);
    const registrationDateStart = recentRegistrationStart(query.keywords);
    if (registrationDateStart) baseParams.set("registrationDateStart", registrationDateStart);

    const companies: PrhCompany[] = [];
    for (let page = 1; page <= pages; page += 1) {
      const params = new URLSearchParams(baseParams);
      if (page > 1) params.set("page", String(page));

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
      companies.push(...(data.companies ?? []));
      if ((data.companies?.length ?? 0) < 100) break;
      if (data.totalResults && page * 100 >= data.totalResults) break;
    }

    const seen = new Set<string>();
    return companies
      .filter((company) => {
        const businessId = company.businessId?.value;
        if (!businessId || seen.has(businessId)) return false;
        if (company.endDate || !companyName(company)) return false;
        if (company.companySituations?.some((situation) => !situation.endDate)) return false;
        seen.add(businessId);
        return true;
      })
      .slice(0, requested)
      .map((company) => {
        const name = companyName(company)!;
        const industry = description(company.mainBusinessLine?.descriptions) ?? query.industry;
        const website = company.website?.url || undefined;
        const businessId = company.businessId!.value!;
        return {
          provider: this.name,
          providerPlaceId: businessId,
          companyName: name,
          website,
          domain: website,
          industry,
          location: companyLocation(company) ?? query.location,
          description: `PRH/YTJ Y-tunnus: ${businessId}.`,
          whyRelevant: `PRH/YTJ-kandidaatti, joka arvioidaan Myyntiprofiilisi perusteella.`,
          registrationDate: company.registrationDate ?? undefined,
          companyForm: companyForm(company),
        };
      });
  }
}
