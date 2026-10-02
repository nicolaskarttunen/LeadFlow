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
  return {
    companyName: place.displayName?.text,
    location: place.formattedAddress,
    industry: place.primaryTypeDisplayName?.text,
    businessStatus: place.businessStatus,
    website: place.websiteUri,
    domain: normalizeDomain(place.websiteUri),
    phone: place.nationalPhoneNumber,
  };
}
