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
        title="Create your account"
        subtitle="Start with a private workspace. We will add research and outreach providers after the core data layer is stable."
      >
        <SignUpForm />
      </AuthCard>
    </main>
  );
}
