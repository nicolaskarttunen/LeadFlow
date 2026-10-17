import prisma from "@/lib/prisma";
import { decryptEmailTokenBundle, encryptEmailTokenBundle } from "@/lib/email/token-encryption";

type GoogleConfig = { email?: string };

export async function getGoogleSender(workspaceId: string) {
  const connection = await prisma.providerConnection.findUnique({
    where: { workspaceId_type_providerName: { workspaceId, type: "EMAIL", providerName: "GOOGLE_GMAIL" } },
  });
  if (!connection?.enabled || !connection.secretReference) throw new Error("Gmail-yhteys puuttuu.");
  const config = connection.publicConfig as GoogleConfig | null;
  if (!config?.email) throw new Error("Gmail-lähettäjän osoite puuttuu.");
  return { connection, email: config.email };
}

export async function googleAccessToken(connection: Awaited<ReturnType<typeof getGoogleSender>>["connection"]) {
  if (!connection.secretReference) throw new Error("Gmail-valtuutus puuttuu.");
  const tokens = decryptEmailTokenBundle(connection.secretReference);
  if (!tokens.scope?.split(" ").includes("https://www.googleapis.com/auth/gmail.send")) {
    throw new Error("Gmail-lähetysoikeus puuttuu. Yhdistä Gmail uudelleen.");
  }
  if (tokens.expiresAt && Date.parse(tokens.expiresAt) > Date.now() + 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) throw new Error("Gmail-valtuutus vanhentui. Yhdistä Gmail uudelleen.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_EMAIL_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_EMAIL_CLIENT_SECRET ?? "",
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !result.access_token) throw new Error("Gmail-valtuutuksen uusiminen epäonnistui. Yhdistä Gmail uudelleen.");
  const refreshed = {
    ...tokens,
    accessToken: result.access_token,
    expiresAt: new Date(Date.now() + (result.expires_in ?? 3600) * 1000).toISOString(),
  };
  await prisma.providerConnection.update({
    where: { id: connection.id },
    data: { secretReference: encryptEmailTokenBundle(refreshed) },
  });
  return refreshed.accessToken;
}

function mimeHeader(value: string) {
  return "=?UTF-8?B?" + Buffer.from(value, "utf8").toString("base64") + "?=";
}

export async function sendGmailMessage(accessToken: string, from: string, to: string, subject: string, body: string) {
  if (/[\r\n]/.test(from + to)) throw new Error("Virheellinen sähköpostiosoite.");
  const mime = [
    `From: <${from}>`,
    `To: <${to}>`,
    `Subject: ${mimeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64"),
  ].join("\r\n");
  const raw = Buffer.from(mime, "utf8").toString("base64url");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
    cache: "no-store",
  });
  const result = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message || "Gmail-lähetys epäonnistui.");
  return result.id;
}
