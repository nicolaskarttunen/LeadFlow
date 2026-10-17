import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import {
  EMAIL_OAUTH_COOKIE,
  callbackUrl,
  codeChallenge,
  createEmailOAuthCookie,
  encodeOAuthCookie,
  googleEmailOAuthConfigured,
} from "@/lib/email/oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!googleEmailOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/email?error=google-not-configured", process.env.BETTER_AUTH_URL ?? "http://localhost:3000"));
  }

  const { workspace } = await requireWorkspace();
  const oauth = createEmailOAuthCookie("google", workspace.id);
  const cookieStore = await cookies();
  cookieStore.set(EMAIL_OAUTH_COOKIE, encodeOAuthCookie(oauth), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_EMAIL_CLIENT_ID!);
  url.searchParams.set("redirect_uri", callbackUrl("google"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email https://www.googleapis.com/auth/gmail.send");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", oauth.state);
  url.searchParams.set("code_challenge", codeChallenge(oauth.verifier));
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url);
}
