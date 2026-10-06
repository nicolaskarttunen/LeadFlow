import type { DiscoveredLead } from "./types";

type SalesProfileForRanking = {
  offering?: string | null;
  targetCustomer?: string | null;
  industries: string[];
  keywords: string[];
  excludedIndustries: string[];
  excludedCompanies: string[];
};

function text(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => needle && haystack.includes(needle));
}

function monthsSince(date?: string) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
}

function targetsProperty(profileText: string) {
  return includesAny(profileText, ["kiinteistö", "asunto", "taloyhti", "property", "real estate", "housing"]);
}

function targetsNonprofits(profileText: string) {
  return includesAny(profileText, ["yhdist", "järjest", "sääti", "nonprofit", "association", "foundation"]);
}

function targetsServiceBusinesses(profileText: string) {
  return includesAny(profileText, ["palveluyr", "service business", "palvelual", "professional service"]);
}

const SERVICE_INDUSTRY_HINTS = [
  "palvel", "konsult", "kirjanp", "tilitoim", "mainos", "markkin", "siivous", "huolto",
  "asennus", "korjaus", "koulutus", "suunnittelu", "ohjelmisto", "it-", "kuljetus",
  "terveys", "kauneus", "ravintola", "majoitus", "henkilöst", "rekry", "lakiasia",
  "arkkitehti", "insinööri", "valokuva", "media", "viestint", "isännöinti", "vuokraus",
];

const PROPERTY_FORMS = [
  "asunto-osakeyhtiö", "asunto-osakeyhtio", "kiinteistöosakeyhtiö", "kiinteistoosakeyhtio",
  "keskinäinen kiinteistöosakeyhtiö", "keskinainen kiinteistoosakeyhtio",
];

const NONPROFIT_FORMS = ["yhdistys", "säätiö", "saatio", "association", "foundation"];

const WEAK_GENERAL_INDUSTRIES = [
  "asuntojen ja asuinkiinteistöjen hallinta",
  "muiden kiinteistöjen vuokraus ja hallinta",
  "holdingyhtiöiden toiminta",
  "holding-yhtiöiden toiminta",
];

export function rankCandidates(leads: DiscoveredLead[], profile: SalesProfileForRanking) {
  const profileText = text([profile.offering, profile.targetCustomer, ...profile.industries].filter(Boolean).join(" "));
  const keywordText = text(profile.keywords.join(" "));
  const excludedCompanies = profile.excludedCompanies.map(text).filter(Boolean);
  const excludedIndustries = profile.excludedIndustries.map(text).filter(Boolean);
  const wantsNoWebsite = includesAny(keywordText, ["ei verkkosivua", "no website"]);
  const wantsWebsiteSignals = includesAny(keywordText, [
    "vanhentunut verkkosivu", "heikko hakukonenäkyvyys", "yhteydenotto vaikeaa",
    "outdated website", "weak search visibility", "contact", "seo",
  ]);
  const wantsNewCompany = includesAny(keywordText, ["uusi yritys", "new company"]);
  const propertyTarget = targetsProperty(profileText);
  const nonprofitTarget = targetsNonprofits(profileText);
  const serviceTarget = targetsServiceBusinesses(profileText);

  return leads
    .map((lead) => {
      const name = text(lead.companyName);
      const industry = text(lead.industry);
      const form = text(lead.companyForm);

      if (excludedCompanies.some((value) => name.includes(value))) return null;
      if (excludedIndustries.some((value) => industry.includes(value))) return null;

      if (!propertyTarget && includesAny(form, PROPERTY_FORMS)) return null;
      if (!propertyTarget && includesAny(industry, ["asuntojen ja asuinkiinteistöjen hallinta"])) return null;
      if (!nonprofitTarget && includesAny(form, NONPROFIT_FORMS)) return null;

      let score = 20;
      const reasons: string[] = [];

      if (includesAny(form, ["osakeyhtiö", "limited company"])) {
        score += 10;
        reasons.push("aktiivinen osakeyhtiö");
      }

      const serviceIndustry = includesAny(industry, SERVICE_INDUSTRY_HINTS);
      if (serviceTarget && serviceIndustry) {
        score += 22;
        reasons.push("toimiala sopii tavoiteltuun palveluyritysprofiiliin");
      } else if (serviceTarget && industry) {
        score -= 10;
      }

      if (includesAny(industry, WEAK_GENERAL_INDUSTRIES) && !propertyTarget) {
        score -= 25;
      }

      if (profile.industries.length && profile.industries.some((value) => {
        const wanted = text(value);
        return wanted && (industry.includes(wanted) || wanted.includes(industry));
      })) {
        score += 25;
        reasons.push("toimiala vastaa myyntiprofiilia");
      }

      if (wantsNoWebsite && !lead.website) {
        score += 30;
        reasons.push("verkkosivua ei löytynyt PRH/YTJ-tiedoista");
      } else if (wantsWebsiteSignals && lead.website) {
        score += 15;
        reasons.push("verkkosivu voidaan analysoida ostosignaalien varalta");
      }

      const ageMonths = monthsSince(lead.registrationDate);
      if (wantsNewCompany && ageMonths !== null) {
        if (ageMonths <= 18) {
          score += 25;
          reasons.push("yritys on rekisteröity hiljattain");
        } else if (ageMonths <= 36) {
          score += 12;
          reasons.push("yritys on melko uusi");
        }
      }

      if (!lead.industry) score -= 12;
      if (!lead.location) score -= 5;

      return {
        ...lead,
        discoveryScore: Math.max(0, Math.min(100, score)),
        discoveryReasons: reasons,
        whyRelevant: reasons.length
          ? `Esikarsinnassa hyvä osuma: ${reasons.join(", ")}.`
          : lead.whyRelevant,
      };
    })
    .filter((lead): lead is DiscoveredLead => Boolean(lead))
    .sort((a, b) => {
      const scoreDiff = (b.discoveryScore ?? 0) - (a.discoveryScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.registrationDate ?? "").localeCompare(a.registrationDate ?? "");
    });
}
