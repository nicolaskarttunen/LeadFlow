import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { VerifyEmailPanel } from "@/components/verify-email-panel";
import { getSession } from "@/lib/session";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await getSession();
  if (session?.user?.emailVerified) {
    redirect("/onboarding");
  }

  const query = await searchParams;
  const email = query.email?.trim().toLowerCase();

  if (!email) {
    redirect("/sign-up");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <AuthCard
        title="Vahvista sähköpostisi"
        subtitle="Vahvistus suojaa tiliäsi ja varmistaa, että 14 päivän kokeilu kuuluu oikealle käyttäjälle."
      >
        <VerifyEmailPanel email={email} />
      </AuthCard>
    </main>
  );
}
