/**
 * Broad Sales Profile categories are not PRH business-line names.
 * Resolve them to evidence-based industry groups without claiming purchase intent.
 */
function normalize(value: string) {
  return value.trim().toLocaleLowerCase("fi-FI");
}

const SERVICE_INDUSTRIES = [
  "ravintola", "kahvila", "pitopalvel", "ruokaravintola", "fysioterapia", "tervey",
  "hieronta", "kampaamo", "parturi", "kauneus", "siivous", "huolto", "korjaamo",
  "korjaus", "asennus", "rakennus", "lvi", "sähkö", "kuljetus", "logisti",
  "tilitoimi", "kirjanpit", "konsult", "suunnittelu", "ohjelmisto",
  "mainos", "markkinointi", "media", "majoitus", "matkailu", "koulutus",
  "rekry", "henkilöstö", "asianajo", "lakiasia", "isännöinti", "valokuva",
  "eläinlääk", "hammaslääk", "arkkitehti", "insinööri", "palvelut",
];

const COMMERCE_INDUSTRIES = [
  "vähittäiskaup", "tukkukaup", "verkkokaup", "kauppa", "myymäl",
  "kaupallinen", "retail", "wholesale",
];

function matchesGroup(industry: string, hints: string[]) {
  return hints.some((hint) => industry.includes(hint));
}

/** Returns null when the actual industry is missing; no invented matches. */
export function matchesTargetIndustry(actual: string | null | undefined, targets: string[]): boolean | null {
  const industry = normalize(actual ?? "");
  if (!industry) return null;
  if (!targets.length) return null;

  return targets.some((raw) => {
    const target = normalize(raw);
    if (!target) return false;
    if (
      target === "palveluyritykset" ||
      target.includes("palveluyrity") ||
      target === "service businesses"
    ) return matchesGroup(industry, SERVICE_INDUSTRIES);

    if (
      target.includes("kauppa & verkkokauppa") ||
      target.includes("kauppa ja verkkokauppa") ||
      target === "retail and ecommerce"
    ) return matchesGroup(industry, COMMERCE_INDUSTRIES);

    return industry.includes(target) || target.includes(industry);
  });
}

/** A Finland-wide target includes PRH/YTJ's Finnish companies even when their address lists only a city. */
export function matchesTargetRegion(
  location: string | null | undefined,
  targets: string[],
  providerName: string | null | undefined,
): boolean | null {
  if (!targets.length) return null;
  const regionValues = targets.map(normalize).filter(Boolean);
  const nationwide = regionValues.some((region) =>
    ["suomi", "koko suomi", "finland", "all finland"].includes(region),
  );
  if (nationwide && ["prh-ytj", "google-places"].includes(providerName ?? "")) return true;
  const knownLocation = normalize(location ?? "");
  if (!knownLocation) return null;
  if (nationwide && /\\b(suomi|finland)\\b/u.test(knownLocation)) return true;
  return regionValues.some((region) => knownLocation.includes(region));
}
