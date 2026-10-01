import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { SignInForm } from "@/components/auth-form";
import { getSession } from "@/lib/session";

export default async function SignInPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to your LeadFlow workspace."
      >
        <SignInForm />
      </AuthCard>
    </main>
  );
}
