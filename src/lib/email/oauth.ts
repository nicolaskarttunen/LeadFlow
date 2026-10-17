import { createHash, randomBytes } from "node:crypto";

export type EmailProvider = "google" | "microsoft";

export type EmailOAuthCookie = {
  provider: EmailProvider;
  state: string;
  verifier: string;
  workspaceId: string;
  expiresAt: number;
};

export const EMAIL_OAUTH_COOKIE = "leadflow_email_oauth";

export function appBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function callbackUrl(provider: EmailProvider) {
  return `${appBaseUrl()}/api/email-connections/${provider}/callback`;
}

export function createEmailOAuthCookie(provider: EmailProvider, workspaceId: string): EmailOAuthCookie {
  return {
    provider,
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    workspaceId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
}

export function codeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function encodeOAuthCookie(value: EmailOAuthCookie) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeOAuthCookie(value?: string | null): EmailOAuthCookie | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as EmailOAuthCookie;
    if (
      (parsed.provider !== "google" && parsed.provider !== "microsoft") ||
      !parsed.state ||
      !parsed.verifier ||
      !parsed.workspaceId ||
      !parsed.expiresAt ||
      parsed.expiresAt < Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function googleEmailOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_EMAIL_CLIENT_ID &&
      process.env.GOOGLE_EMAIL_CLIENT_SECRET &&
      process.env.EMAIL_TOKEN_ENCRYPTION_KEY,
  );
}

export function microsoftEmailOAuthConfigured() {
  return Boolean(
    process.env.MICROSOFT_EMAIL_CLIENT_ID &&
      process.env.MICROSOFT_EMAIL_CLIENT_SECRET &&
      process.env.EMAIL_TOKEN_ENCRYPTION_KEY,
  );
}

export function microsoftTenant() {
  return process.env.MICROSOFT_EMAIL_TENANT?.trim() || "common";
}
