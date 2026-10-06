import { normalizeCompanyName, normalizeDomain } from "@/lib/normalize";
import { reserveGooglePlacesDetails } from "./place-details-usage";
import { reserveGooglePlacesTextSearch } from "./usage";
import type { DiscoveredLead } from "./types";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  businessStatus?: string;
  websiteUri?: string;
};

type SearchResponse = { places?: GooglePlace[] };

const LEGAL_SUFFIXES = ["oy", "oyj", "ab", "abp", "ky", "ay"];
const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "x.com", "twitter.com"];

function companyCore(value: string) {
  const parts = normalizeCompanyName(value).split(" ").filter(Boolean);
  while (parts.length && LEGAL_SUFFIXES.includes(parts[parts.length - 1]!)) parts.pop();
  return parts.join(" ");
}

function nameMatchScore(expected: string, actual: string) {
  const a = companyCore(expected);
  const b = companyCore(actual);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 85;
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
  return Math.round((overlap / Math.max(aTokens.size, bTokens.size)) * 100);
}

function ownedWebsite(url?: string) {
  if (!url) return undefined;
  const domain = normalizeDomain(url);
  if (!domain) return undefined;
  if (SOCIAL_HOSTS.some((host) => domain === host || domain.endsWith(`.${host}`))) return undefined;
  return url;
}

export async function enrichCandidateWithGoogle(
  lead: DiscoveredLead,
  workspaceId: string,
): Promise<DiscoveredLead> {
  if (lead.websiteStatus === "FOUND" && lead.website) return lead;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return lead;

  await reserveGooglePlacesTextSearch(workspaceId);
  const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: [lead.companyName, lead.location].filter(Boolean).join(" "),
      pageSize: 3,
      languageCode: "fi",
      regionCode: "FI",
      includePureServiceAreaBusinesses: true,
    }),
    cache: "no-store",
  });

  if (!searchResponse.ok) return lead;
  const searchData = (await searchResponse.json()) as SearchResponse;
  const match = (searchData.places ?? [])
    .filter((place) => place.id && place.displayName?.text && place.businessStatus !== "CLOSED_PERMANENTLY")
    .map((place) => ({ place, score: nameMatchScore(lead.companyName, place.displayName!.text!) }))
    .filter((item) => item.score >= 85)
    .sort((a, b) => b.score - a.score)[0]?.place;

  if (!match?.id) return lead;

  await reserveGooglePlacesDetails(workspaceId);
  const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(match.id)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,businessStatus,websiteUri",
    },
    cache: "no-store",
  });

  if (!detailsResponse.ok) return { ...lead, googlePlaceId: match.id, googleMatchName: match.displayName?.text };
  const details = (await detailsResponse.json()) as GooglePlace;
  const website = ownedWebsite(details.websiteUri);
  const reasons = [...(lead.discoveryReasons ?? [])];

  if (website) reasons.push("Google-yritystiedosta löytyi oma verkkosivu");
  else reasons.push("Google-yritystieto löytyi, mutta omaa verkkosivua ei ollut linkitetty");

  return {
    ...lead,
    website: website ?? undefined,
    domain: website ?? undefined,
    websiteStatus: website ? "FOUND" : "MISSING",
    googlePlaceId: details.id ?? match.id,
    googleMatchName: details.displayName?.text ?? match.displayName?.text,
    location: lead.location ?? details.formattedAddress,
    discoveryReasons: reasons,
  };
}
