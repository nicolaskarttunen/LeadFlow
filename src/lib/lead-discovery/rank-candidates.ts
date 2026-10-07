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

function targetsBranches(profileText: string) {
  return includesAny(profileText, ["sivuliike", "filial", "branch office", "foreign branch"]);
}

const SERVICE_INDUSTRY_HINTS = [
  "konsult", "kirjanp", "tilitoim", "mainos", "markkin", "siivous", "huolto",
  "sähköasennus", "lvi", "putkiasennus", "rakennusasennus", "korjaus", "koulutus",
  "suunnittelu", "ohjelmisto", "it-", "kuljetus", "terveys", "kauneus", "ravintola",
  "majoitus", "henkilöst", "rekry", "lakiasia", "arkkitehti", "insinööri", "valokuva",
  "media", "viestint", "isännöinti", "fysioterapia", "hammas", "lääkäri", "kampaamo",
  "parturi", "hieronta", "autokorjaamo", "remont", "päivähoito", "lastenhoito",
];

const PROPERTY_FORMS = [
  "asunto-osakeyhtiö", "asunto-osakeyhtio", "kiinteistöosakeyhtiö", "kiinteistoosakeyhtio",
  "keskinäinen kiinteistöosakeyhtiö", "keskinainen kiinteistoosakeyhtio",
];

const NONPROFIT_FORMS = ["yhdistys", "säätiö", "saatio", "association", "foundation"];
const BRANCH_HINTS = ["sivuliike", "filial", "branch office", "ulkomaisen elinkeinonharjoittajan"];

const PASSIVE_INDUSTRY_HINTS = [
  "asuntojen ja asuinkiinteistöjen hallinta",
  "muiden kiinteistöjen vuokraus ja hallinta",
  "omien kiinteistöjen kauppa",
  "kiinteistöjen vuokraus ja hallinta",
  "kiinteistösijoittaminen",
  "holdingyhtiöiden toiminta",
  "holding-yhtiöiden toiminta",
  "sijoitusyhtiö",
  "muualla luokittelematon muu rahoituspalvelutoiminta",
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
  const branchTarget = targetsBranches(profileText);
  const minimumProfileFit = profile.industries.length === 0 ? 70 : 35;

  return leads
    .map((lead) => {
      const name = text(lead.companyName);
      const industry = text(lead.industry);
      const form = text(lead.companyForm);

      if (excludedCompanies.some((value) => name.includes(value))) return null;
      if (excludedIndustries.some((value) => industry.includes(value))) return null;
      if (!propertyTarget && includesAny(form, PROPERTY_FORMS)) return null;
      if (!nonprofitTarget && includesAny(form, NONPROFIT_FORMS)) return null;
      if (!branchTarget && (includesAny(name, BRANCH_HINTS) || includesAny(form, BRANCH_HINTS))) return null;

      const passiveIndustry = includesAny(industry, PASSIVE_INDUSTRY_HINTS);
      if (!propertyTarget && passiveIndustry) return null;

      const serviceIndustry = includesAny(industry, SERVICE_INDUSTRY_HINTS);
      if (lead.profileFitScore !== undefined && lead.profileFitScore < minimumProfileFit) return null;

      let score = 20;
      const reasons: string[] = [];

      if (includesAny(form, ["osakeyhtiö", "limited company"])) {
        score += 10;
        reasons.push("aktiivinen osakeyhtiö");
      }

      if (serviceTarget && serviceIndustry) {
        score += 28;
        reasons.push("toimiala sopii tavoiteltuun palveluyritysprofiiliin");
      } else if (serviceTarget && industry) {
        score -= 15;
      }

      if (profile.industries.length && profile.industries.some((value) => {
        const wanted = text(value);
        return wanted && (industry.includes(wanted) || wanted.includes(industry));
      })) {
        score += 25;
        reasons.push("toimiala vastaa myyntiprofiilia");
      }

      if (lead.profileFitScore !== undefined) {
        score += Math.round((lead.profileFitScore - 50) * 0.6);
        if (lead.profileFitScore >= 70) {
          reasons.push(lead.profileFitReason || "AI arvioi yrityksen sopivan hyvin Myyntiprofiiliin");
        }
      }

      if (wantsNoWebsite && lead.websiteStatus === "MISSING") {
        score += serviceTarget && serviceIndustry ? 30 : 18;
        reasons.push("Google-yritystiedossa ei ollut omaa verkkosivua");
      } else if (wantsWebsiteSignals && lead.websiteStatus === "FOUND" && lead.website) {
        score += 10;
      } else if (lead.websiteStatus === "UNKNOWN") {
        score -= 5;
      }

      const verifiedSignals = lead.buyingSignals ?? [];
      if (verifiedSignals.length) {
        const signalBonus = Math.min(
          20,
          verifiedSignals.reduce(
            (total, item) => total + (item.confidence === "HIGH" ? 8 : 5),
            0,
          ),
        );
        score += signalBonus;
        reasons.push(`varmennettuja ostosignaaleja: ${verifiedSignals.slice(0, 2).map((item) => item.label).join(", ")}`);
      }

      const ageMonths = monthsSince(lead.registrationDate);
      if (wantsNewCompany && ageMonths !== null) {
        if (ageMonths <= 18) {
          score += serviceTarget && serviceIndustry ? 20 : 8;
          reasons.push("yritys on rekisteröity hiljattain");
        } else if (ageMonths <= 36) {
          score += serviceTarget && serviceIndustry ? 10 : 4;
          reasons.push("yritys on melko uusi");
        }
      }

      if (!lead.industry) score -= 12;
      if (!lead.location) score -= 5;

      return {
        ...lead,
        discoveryScore: Math.max(0, Math.min(100, score)),
        discoveryReasons: reasons,
        whyRelevant: lead.buyingSignalSummary
          ? `Miksi kontaktoida: ${lead.buyingSignalSummary}.`
          : reasons.length
            ? `Esikarsinnassa hyvä osuma: ${reasons.join(", ")}.`
            : lead.whyRelevant,
      };
    })
    .filter((lead) => lead !== null)
    .sort((a, b) => {
      const scoreDiff = (b.discoveryScore ?? 0) - (a.discoveryScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.registrationDate ?? "").localeCompare(a.registrationDate ?? "");
    });
}
