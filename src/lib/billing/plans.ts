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
};

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  TRIAL: {
    id: "TRIAL",
    name: "Trial",
    priceMonthlyEur: 0,
    verifiedLeadLimit: 20,
    trialDays: 14,
    descriptionFi: "Kokeile LeadFlow'n koko ydinkokemus ennen maksullista tilausta.",
    descriptionEn: "Try the core LeadFlow experience before choosing a paid plan.",
    featuresFi: [
      "20 varmennettua liidiä",
      "14 päivän käyttöoikeus",
      "Yritystutkimus ja ostosignaalit",
      "Julkisten yhteystietojen rikastus",
      "AI-sähköpostiluonnokset",
    ],
    featuresEn: [
      "20 verified leads",
      "14 days of access",
      "Company research and buying signals",
      "Public contact enrichment",
      "AI email drafts",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthlyEur: 49,
    verifiedLeadLimit: 50,
    descriptionFi: "Pienelle yritykselle, joka haluaa aloittaa jatkuvan B2B-prospektoinnin.",
    descriptionEn: "For a small business starting consistent B2B prospecting.",
    featuresFi: [
      "50 varmennettua liidiä / kk",
      "Yritystutkimus ja ostosignaalit",
      "Yhteystietojen rikastus",
      "AI-sähköpostiluonnokset",
    ],
    featuresEn: [
      "50 verified leads / month",
      "Company research and buying signals",
      "Contact enrichment",
      "AI email drafts",
    ],
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    priceMonthlyEur: 99,
    verifiedLeadLimit: 150,
    descriptionFi: "Yritykselle, joka haluaa pitää myyntiputken jatkuvasti täynnä.",
    descriptionEn: "For teams that want a continuously full sales pipeline.",
    featuresFi: [
      "150 varmennettua liidiä / kk",
      "Kaikki Starter-ominaisuudet",
      "Jatkuva prospektointi",
      "Laajemmat automaatiot",
    ],
    featuresEn: [
      "150 verified leads / month",
      "Everything in Starter",
      "Continuous prospecting",
      "More automation",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthlyEur: 199,
    verifiedLeadLimit: 400,
    descriptionFi: "Aktiiviseen B2B-myyntiin ja suurempaan prospektointivolyymiin.",
    descriptionEn: "For active B2B sales and higher prospecting volume.",
    featuresFi: [
      "400 varmennettua liidiä / kk",
      "Kaikki Growth-ominaisuudet",
      "Suuremmat automaatiorajat",
      "Tiimikäyttöön suunniteltu kapasiteetti",
    ],
    featuresEn: [
      "400 verified leads / month",
      "Everything in Growth",
      "Higher automation limits",
      "Capacity designed for teams",
    ],
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
