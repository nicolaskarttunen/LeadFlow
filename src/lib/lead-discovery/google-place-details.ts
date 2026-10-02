import { normalizeDomain } from "@/lib/normalize";

type GooglePlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
  businessStatus?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
};

function isOwnedBusinessWebsite(value?: string) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const socialHosts = ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "x.com", "twitter.com"];
    return !socialHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function getGooglePlaceDetails(placeId: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places API key is not configured.");

  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,primaryTypeDisplayName,businessStatus,websiteUri,nationalPhoneNumber",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Google Place Details enrichment failed", response.status, details);
    throw new Error("Company enrichment provider returned an error.");
  }

  const place = (await response.json()) as GooglePlaceDetails;
  const ownedWebsite = isOwnedBusinessWebsite(place.websiteUri) ? place.websiteUri : undefined;
  return {
    companyName: place.displayName?.text,
    location: place.formattedAddress,
    industry: place.primaryTypeDisplayName?.text,
    businessStatus: place.businessStatus,
    website: ownedWebsite,
    socialProfile: place.websiteUri && !ownedWebsite ? place.websiteUri : undefined,
    domain: normalizeDomain(ownedWebsite),
    phone: place.nationalPhoneNumber,
  };
}
