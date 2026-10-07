import { researchPublicWebsite } from "@/lib/lead-research/website-research";
import type { BuyingSignal, DiscoveredLead } from "./types";

const BATCH_SIZE = 4;

function signal(
  key: string,
  label: string,
  evidence: string,
  confidence: BuyingSignal["confidence"],
): BuyingSignal {
  return { key, label, evidence, confidence };
}

function summary(signals: BuyingSignal[]) {
  if (!signals.length) return undefined;
  return signals.slice(0, 3).map((item) => item.label).join(" · ");
}

function recommendedAngle(signals: BuyingSignal[]) {
  const keys = new Set(signals.map((item) => item.key));
  if (keys.has("google_no_website")) return "Verkkosivut ja paikallinen löydettävyys";
  if (keys.has("missing_h1") || keys.has("missing_meta")) return "SEO ja verkkosivun rakenne";
  if (keys.has("weak_contact") || keys.has("missing_cta")) return "Konversio ja yhteydenoton helpottaminen";
  if (keys.has("no_https")) return "Verkkosivun tekninen päivitys ja luottamus";
  return signals.length ? "Verkkosivun kehitys havaittujen puutteiden perusteella" : undefined;
}

export async function verifyBuyingSignals(lead: DiscoveredLead): Promise<DiscoveredLead> {
  if (lead.websiteStatus === "MISSING") {
    const signals = [
      signal(
        "google_no_website",
        "Google-yritystiedossa ei ollut omaa verkkosivua",
        "Google Places -yritystiedosta ei löytynyt linkitettyä omaa verkkosivua. Tämä ei yksin todista, ettei verkkosivua olisi muualla.",
        "MEDIUM",
      ),
    ];

    return {
      ...lead,
      websiteResearchStatus: "NO_WEBSITE_LISTED",
      buyingSignals: signals,
      buyingSignalSummary: summary(signals),
      recommendedAngle: recommendedAngle(signals),
    };
  }

  if (!lead.website || lead.websiteStatus !== "FOUND") {
    return {
      ...lead,
      websiteResearchStatus: "UNVERIFIED",
    };
  }

  try {
    const research = await researchPublicWebsite(lead.website);
    const signals: BuyingSignal[] = [];

    if (!research.httpsEnabled) {
      signals.push(signal(
        "no_https",
        "Sivu ei käytä HTTPS-yhteyttä",
        `Etusivu avautui osoitteesta ${research.finalUrl}.`,
        "HIGH",
      ));
    }

    if (!research.h1) {
      signals.push(signal(
        "missing_h1",
        "Etusivulta puuttuu H1-pääotsikko",
        "Etusivun HTML:stä ei löytynyt H1-elementtiä.",
        "HIGH",
      ));
    }

    if (!research.metaDescription) {
      signals.push(signal(
        "missing_meta",
        "Meta description puuttuu",
        "Etusivun HTML:stä ei löytynyt meta description -kuvausta.",
        "HIGH",
      ));
    }

    if (!research.hasPrimaryCta) {
      signals.push(signal(
        "missing_cta",
        "Etusivulta ei löytynyt selkeää toimintakehotusta",
        "Nopeassa etusivutarkistuksessa ei löytynyt esimerkiksi tarjous-, ajanvaraus- tai yhteydenottokehotusta.",
        "MEDIUM",
      ));
    }

    if (!research.hasContactLink && research.emails.length === 0 && !research.hasPhone) {
      signals.push(signal(
        "weak_contact",
        "Yhteydenotto ei näy selkeästi etusivulla",
        "Etusivulta ei löytynyt yhteydenottolinkkiä, sähköpostiosoitetta tai tunnistettavaa puhelinnumeroa.",
        "MEDIUM",
      ));
    }

    return {
      ...lead,
      websiteResearchStatus: "ANALYZED",
      buyingSignals: signals,
      buyingSignalSummary: summary(signals),
      recommendedAngle: recommendedAngle(signals),
      publicEmails: research.emails,
    };
  } catch (error) {
    console.error("Buying signal website verification failed", {
      companyName: lead.companyName,
      website: lead.website,
      error,
    });

    return {
      ...lead,
      websiteResearchStatus: "UNVERIFIED",
    };
  }
}

export async function verifyBuyingSignalsForCandidates(leads: DiscoveredLead[]) {
  const verified: DiscoveredLead[] = [];

  for (let offset = 0; offset < leads.length; offset += BATCH_SIZE) {
    const batch = leads.slice(offset, offset + BATCH_SIZE);
    verified.push(...await Promise.all(batch.map(verifyBuyingSignals)));
  }

  return verified;
}
