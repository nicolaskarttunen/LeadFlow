import { normalizeEmail } from "@/lib/normalize";

function hostnameFromWebsite(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function emailDomain(value: string) {
  return value.split("@")[1]?.toLowerCase() ?? null;
}

export function selectBusinessEmails(emails: string[], website?: string) {
  const normalized = Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );

  const host = hostnameFromWebsite(website);
  if (!host) return normalized.length === 1 ? normalized : [];

  const sameDomain = normalized.filter((email) => {
    const domain = emailDomain(email);
    return domain === host || Boolean(domain?.endsWith(`.${host}`));
  });

  return sameDomain.slice(0, 5);
}
