import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import {
  EMAIL_OAUTH_COOKIE,
  callbackUrl,
  codeChallenge,
  createEmailOAuthCookie,
  encodeOAuthCookie,
  microsoftEmailOAuthConfigured,
  microsoftTenant,
} from "@/lib/email/oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!microsoftEmailOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/email?error=microsoft-not-configured", process.env.BETTER_AUTH_URL ?? "http://localhost:3000"));
  }

  const { workspace } = await requireWorkspace();
  const oauth = createEmailOAuthCookie("microsoft", workspace.id);
  const cookieStore = await cookies();
  cookieStore.set(EMAIL_OAUTH_COOKIE, encodeOAuthCookie(oauth), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  const tenant = encodeURIComponent(microsoftTenant());
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", process.env.MICROSOFT_EMAIL_CLIENT_ID!);
  url.searchParams.set("redirect_uri", callbackUrl("microsoft"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email offline_access User.Read Mail.Send");
  url.searchParams.set("state", oauth.state);
  url.searchParams.set("code_challenge", codeChallenge(oauth.verifier));
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url);
}
