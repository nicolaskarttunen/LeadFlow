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

// Some small companies explicitly publish a Gmail or Outlook address
// instead of using an inbox on their own domain.
const PUBLIC_MAIL_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com",
  "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com",
  "proton.me", "protonmail.com", "luukku.com", "suomi24.fi",
]);

/**
 * Same-domain addresses are accepted when observed on the public company
 * website. An address at a third-party public email provider must ALSO be
 * explicitly present in a mailto link on that website.
 *
 * These are publicly observed contact addresses, not mailbox verification.
 */
export function selectBusinessEmails(emails: string[], website?: string, explicitMailtoEmails: string[] = []) {
  const normalized = Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );
  const host = hostnameFromWebsite(website);
  if (!host) return [];

  const sameDomain = normalized.filter((email) => {
    const domain = emailDomain(email);
    return domain === host || Boolean(domain?.endsWith(`.${host}`));
  });

  const linked = new Set(explicitMailtoEmails.map(normalizeEmail));
  const publishedPublicMailboxes = normalized.filter((email) => {
    const domain = emailDomain(email);
    return domain !== null && PUBLIC_MAIL_PROVIDERS.has(domain) && linked.has(email);
  });

  return Array.from(new Set([...sameDomain, ...publishedPublicMailboxes])).slice(0, 5);
}
