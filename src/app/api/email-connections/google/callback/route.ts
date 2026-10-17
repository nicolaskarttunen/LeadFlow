import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import {
  EMAIL_OAUTH_COOKIE,
  appBaseUrl,
  callbackUrl,
  decodeOAuthCookie,
} from "@/lib/email/oauth";
import {
  decryptEmailTokenBundle,
  encryptEmailTokenBundle,
} from "@/lib/email/token-encryption";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const oauth = decodeOAuthCookie(cookieStore.get(EMAIL_OAUTH_COOKIE)?.value);

  if (providerError) {
    cookieStore.delete(EMAIL_OAUTH_COOKIE);
    return NextResponse.redirect(`${appBaseUrl()}/settings/email?error=google-denied`);
  }

  if (!code || !state || !oauth || oauth.provider !== "google" || oauth.state !== state) {
    cookieStore.delete(EMAIL_OAUTH_COOKIE);
    return NextResponse.redirect(`${appBaseUrl()}/settings/email?error=oauth-state`);
  }

  const { user, workspace } = await requireWorkspace();
  if (workspace.id !== oauth.workspaceId) {
    cookieStore.delete(EMAIL_OAUTH_COOKIE);
    return NextResponse.redirect(`${appBaseUrl()}/settings/email?error=workspace`);
  }

  const tokenBody = new URLSearchParams({
    client_id: process.env.GOOGLE_EMAIL_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_EMAIL_CLIENT_SECRET ?? "",
    code,
    code_verifier: oauth.verifier,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl("google"),
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
    cache: "no-store",
  });

  const tokens = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
  };

  if (!tokenResponse.ok || !tokens.access_token) {
    console.error("Google email OAuth token exchange failed", { status: tokenResponse.status, error: tokens.error });
    cookieStore.delete(EMAIL_OAUTH_COOKIE);
    return NextResponse.redirect(`${appBaseUrl()}/settings/email?error=google-token`);
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  const profile = await profileResponse.json() as { email?: string; name?: string };

  if (!profileResponse.ok || !profile.email) {
    cookieStore.delete(EMAIL_OAUTH_COOKIE);
    return NextResponse.redirect(`${appBaseUrl()}/settings/email?error=google-profile`);
  }

  const existing = await prisma.providerConnection.findUnique({
    where: {
      workspaceId_type_providerName: {
        workspaceId: workspace.id,
        type: "EMAIL",
        providerName: "GOOGLE_GMAIL",
      },
    },
  });

  let refreshToken = tokens.refresh_token ?? null;
  if (!refreshToken && existing?.secretReference) {
    try {
      refreshToken = decryptEmailTokenBundle(existing.secretReference).refreshToken ?? null;
    } catch {
      refreshToken = null;
    }
  }

  const expiresAt = typeof tokens.expires_in === "number"
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const secretReference = encryptEmailTokenBundle({
    accessToken: tokens.access_token,
    refreshToken,
    expiresAt,
    scope: tokens.scope ?? null,
    tokenType: tokens.token_type ?? "Bearer",
  });

  const connection = await prisma.providerConnection.upsert({
    where: {
      workspaceId_type_providerName: {
        workspaceId: workspace.id,
        type: "EMAIL",
        providerName: "GOOGLE_GMAIL",
      },
    },
    update: {
      enabled: true,
      publicConfig: {
        provider: "google",
        email: profile.email,
        displayName: profile.name ?? null,
        connectedAt: new Date().toISOString(),
        expiresAt,
        scopes: tokens.scope?.split(" ") ?? [],
      },
      secretReference,
    },
    create: {
      workspaceId: workspace.id,
      type: "EMAIL",
      providerName: "GOOGLE_GMAIL",
      enabled: true,
      publicConfig: {
        provider: "google",
        email: profile.email,
        displayName: profile.name ?? null,
        connectedAt: new Date().toISOString(),
        expiresAt,
        scopes: tokens.scope?.split(" ") ?? [],
      },
      secretReference,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "email_connection.connected",
      entityType: "provider_connection",
      entityId: connection.id,
      metadata: { provider: "google", email: profile.email },
    },
  });

  cookieStore.delete(EMAIL_OAUTH_COOKIE);
  return NextResponse.redirect(`${appBaseUrl()}/settings/email?connected=google`);
}
