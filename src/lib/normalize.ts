export function normalizeCompanyName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeDomain(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return trimmed
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .trim() || null;
  }
}

export function splitCommaSeparated(value?: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
