export type BillingPlanId = "TRIAL" | "STARTER" | "GROWTH" | "PRO";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  priceMonthlyEur: number;
  verifiedLeadLimit: number;
  trialDays?: number;
  descriptionFi: string;
  descriptionEn: string;
  featuresFi: string[];
  featuresEn: string[];
  notIncludedFi: string[];
  notIncludedEn: string[];
};

export const EARLY_ACCESS_OFFER = {
  enabled: true,
  discountPercent: 30,
  discountedMonths: 3,
} as const;

export function earlyAccessMonthlyPrice(priceMonthlyEur: number) {
  const multiplier = (100 - EARLY_ACCESS_OFFER.discountPercent) / 100;
  return Math.round(priceMonthlyEur * multiplier * 100) / 100;
}

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  TRIAL: {
    id: "TRIAL",
    name: "Trial",
    priceMonthlyEur: 0,
    verifiedLeadLimit: 20,
    trialDays: 14,
    descriptionFi: "Kokeile LeadFlow'n Growth-tason ydinkokemus ennen maksullista tilausta.",
    descriptionEn: "Try the core Growth-level LeadFlow experience before choosing a paid plan.",
    featuresFi: [
      "20 varmennettua liidiä kokeilun aikana",
      "14 päivän käyttöoikeus",
      "Yritystutkimus ja varmennetut ostosignaalit",
      "Verkkosivuanalyysi",
      "Julkisten sähköpostien ja puhelinnumeroiden rikastus",
      "AI Copilot",
      "AI-sähköpostiluonnokset",
      "Liidien hyväksyntä ja laatuhyvitykset",
      "Automaattinen prospektointi trial-kiintiön puitteissa, kun beta-ajastus on käytössä",
    ],
    featuresEn: [
      "20 verified leads during the trial",
      "14 days of access",
      "Company research and verified buying signals",
      "Website analysis",
      "Public email and phone enrichment",
      "AI Copilot",
      "AI email drafts",
      "Lead review and quality credit refunds",
      "Automated prospecting within the trial quota when beta scheduling is available",
    ],
    notIncludedFi: [
      "Yli 20 varmennettua liidiä kokeilun aikana",
      "Maksullisten pakettien suuremmat kuukausikiintiöt",
      "Pro-tason automaatiorajat ja tiimikapasiteetti",
    ],
    notIncludedEn: [
      "More than 20 verified leads during the trial",
      "Higher monthly quotas of paid plans",
      "Pro-level automation limits and team capacity",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthlyEur: 49,
    verifiedLeadLimit: 100,
    descriptionFi: "Pienelle yritykselle, joka haluaa aloittaa säännöllisen B2B-prospektoinnin.",
    descriptionEn: "For a small business starting consistent B2B prospecting.",
    featuresFi: [
      "100 varmennettua liidiä / kk",
      "Manuaaliset liidihaut myyntiprofiilin perusteella",
      "Yritystutkimus ja varmennetut ostosignaalit",
      "Verkkosivuanalyysi",
      "Julkisten sähköpostien ja puhelinnumeroiden rikastus",
      "AI Copilot liidien käsittelyyn",
      "Personoidut AI-sähköpostiluonnokset",
      "Liidien hyväksyntä ja hylkäys",
      "Laatuhyvitys virheellisistä tai profiiliin sopimattomista liideistä",
    ],
    featuresEn: [
      "100 verified leads / month",
      "Manual lead searches based on your sales profile",
      "Company research and verified buying signals",
      "Website analysis",
      "Public email and phone enrichment",
      "AI Copilot for working with leads",
      "Personalized AI email drafts",
      "Lead keep and reject workflow",
      "Quality credit refunds for incorrect or out-of-profile leads",
    ],
    notIncludedFi: [
      "Jatkuva automaattinen prospektointi",
      "Ajastettu uusien liidien toimitus",
      "Laajemmat automaatiot",
      "Pro-tason automaatiorajat ja tiimikapasiteetti",
    ],
    notIncludedEn: [
      "Continuous automated prospecting",
      "Scheduled delivery of new leads",
      "Expanded automations",
      "Pro-level automation limits and team capacity",
    ],
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    priceMonthlyEur: 99,
    verifiedLeadLimit: 300,
    descriptionFi: "Yritykselle, joka haluaa pitää myyntiputken jatkuvasti täynnä.",
    descriptionEn: "For teams that want a continuously full sales pipeline.",
    featuresFi: [
      "300 varmennettua liidiä / kk",
      "Kaikki Starter-paketin tutkimus- ja AI-ominaisuudet",
      "Jatkuva automaattinen prospektointi myyntiprofiilin perusteella",
      "Ajastettu uusien liidien toimitus tarkistettavaksi",
      "Liidien automaattinen tutkimus, pisteytys ja järjestäminen",
      "Hylkäyspalautteen hyödyntäminen seuraavissa hauissa",
      "Laajemmat prospektointi- ja työnkulkuautomaatiot",
      "Laatuhyvitykset",
    ],
    featuresEn: [
      "300 verified leads / month",
      "All Starter research and AI features",
      "Continuous automated prospecting based on your sales profile",
      "Scheduled delivery of new leads for review",
      "Automatic lead research, scoring and prioritization",
      "Reject feedback used to improve future prospecting",
      "Expanded prospecting and workflow automations",
      "Quality credit refunds",
    ],
    notIncludedFi: [
      "Pro-tason suuremmat automaatiorajat",
      "Pro-tason tiimikapasiteetti",
    ],
    notIncludedEn: [
      "Pro-level higher automation limits",
      "Pro-level team capacity",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthlyEur: 199,
    verifiedLeadLimit: 750,
    descriptionFi: "Aktiiviseen B2B-myyntiin ja suurempaan prospektointivolyymiin.",
    descriptionEn: "For active B2B sales and higher prospecting volume.",
    featuresFi: [
      "750 varmennettua liidiä / kk",
      "Kaikki Growth-paketin tutkimus-, AI- ja automaatio-ominaisuudet",
      "Jatkuva automaattinen prospektointi suuremmalla kapasiteetilla",
      "Ajastettu uusien liidien toimitus tarkistettavaksi",
      "Liidien automaattinen tutkimus, pisteytys ja järjestäminen",
      "Hylkäyspalautteen hyödyntäminen seuraavissa hauissa",
      "Suuremmat automaatio- ja prospektointirajat",
      "Tiimikäyttöön suunniteltu kapasiteetti",
      "Laatuhyvitykset",
    ],
    featuresEn: [
      "750 verified leads / month",
      "All Growth research, AI and automation features",
      "Continuous automated prospecting with higher capacity",
      "Scheduled delivery of new leads for review",
      "Automatic lead research, scoring and prioritization",
      "Reject feedback used to improve future prospecting",
      "Higher automation and prospecting limits",
      "Capacity designed for team use",
      "Quality credit refunds",
    ],
    notIncludedFi: [],
    notIncludedEn: [],
  },
};

export const PAID_PLAN_IDS: BillingPlanId[] = ["STARTER", "GROWTH", "PRO"];

export function normalizePlanId(value?: string | null): BillingPlanId {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "TRIAL" || normalized === "STARTER" || normalized === "GROWTH" || normalized === "PRO") {
    return normalized;
  }
  return "TRIAL";
}

export function getBillingPlan(value?: string | null) {
  return BILLING_PLANS[normalizePlanId(value)];
}
