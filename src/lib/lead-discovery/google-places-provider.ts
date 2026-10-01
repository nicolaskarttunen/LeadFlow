import type { DiscoveredLead, LeadDiscoveryProvider, LeadDiscoveryQuery } from "./types";

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  businessStatus?: string;
};

type GoogleTextSearchResponse = { places?: GooglePlace[] };

export class GooglePlacesLeadDiscoveryProvider implements LeadDiscoveryProvider {
  name = "google-places";

  async discover(query: LeadDiscoveryQuery): Promise<DiscoveredLead[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error("Google Places API key is not configured.");

    // Discovery keywords describe the service/opportunity we want to evaluate later.\n    // They must not steer Google Places toward SEO/web agencies instead of the target industry.\n    const terms = [query.industry, query.location].filter(Boolean).join(" ");
    const pageSize = Math.max(1, Math.min(query.limit, 20));

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.types,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery: terms,
        pageSize,
        languageCode: "fi",
        regionCode: "FI",
        includePureServiceAreaBusinesses: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Google Places discovery failed", response.status, details);
      throw new Error("Company discovery provider returned an error.");
    }

    const data = (await response.json()) as GoogleTextSearchResponse;
    return (data.places ?? [])
      .filter((place) => place.displayName?.text && place.businessStatus !== "CLOSED_PERMANENTLY")
      .slice(0, pageSize)
      .map((place) => {
        const companyName = place.displayName!.text!;
        const industry = place.primaryTypeDisplayName?.text ?? query.industry;
        return {
          companyName,
          industry,
          location: place.formattedAddress ?? query.location,
          companySize: query.companySize,
          description: place.formattedAddress ? `Listed business at ${place.formattedAddress}.` : undefined,
          whyRelevant: `Matched Google Places search for ${[query.industry, query.location].filter(Boolean).join(" in ") || "the selected criteria"}.`,
          potentialService: query.keywords?.length ? query.keywords.join(", ") : undefined,
        };
      });
  }
}
