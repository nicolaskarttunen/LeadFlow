import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { SignUpForm } from "@/components/auth-form";
import { getSession } from "@/lib/session";

export default async function SignUpPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <AuthCard
        title="Luo LeadFlow-tili"
        subtitle="Aloita 14 päivän kokeilu. Vahvista sähköpostisi ennen yrityksesi käyttöönottoa."
      >
        <SignUpForm />
      </AuthCard>
    </main>
  );
}
