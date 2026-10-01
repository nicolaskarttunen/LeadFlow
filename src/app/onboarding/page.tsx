import { redirect } from "next/navigation";
import { createWorkspaceAction } from "@/app/onboarding/actions";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireUser } from "@/lib/session";

const input =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10";
const label = "mb-2 block text-sm font-medium text-slate-300";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const current = await getCurrentWorkspace();

  if (current) {
    redirect("/dashboard");
  }

  const query = await searchParams;

  return (
    <main className="min-h-screen px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="mb-3 text-sm font-semibold text-violet-300">
            LeadFlow setup
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Describe your business and target market.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Tell LeadFlow who you serve and what you offer. These details shape your workspace and ideal-customer profile.
          </p>
        </div>

        {query.error === "company-name" ? (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            Enter a company name.
          </div>
        ) : null}

        <form
          action={createWorkspaceAction}
          className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-2"
        >
          <label className="sm:col-span-2">
            <span className={label}>Company name *</span>
            <input name="companyName" required className={input} />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>Website</span>
            <input
              name="website"
              placeholder="https://example.com"
              className={input}
            />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>Company description</span>
            <textarea name="description" rows={3} className={input} />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>What do you sell?</span>
            <textarea name="offering" rows={3} className={input} />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>Who is your ideal customer?</span>
            <textarea name="idealCustomer" rows={3} className={input} />
          </label>

          <label>
            <span className={label}>Industries</span>
            <input
              name="industries"
              placeholder="Construction, dental, consulting"
              className={input}
            />
          </label>

          <label>
            <span className={label}>Countries / regions</span>
            <input
              name="regions"
              placeholder="Finland, Jyväskylä"
              className={input}
            />
          </label>

          <label>
            <span className={label}>Ideal company size</span>
            <input
              name="companySize"
              placeholder="1-50 employees"
              className={input}
            />
          </label>

          <label>
            <span className={label}>Keywords</span>
            <input
              name="keywords"
              placeholder="website redesign, local SEO"
              className={input}
            />
          </label>

          <label>
            <span className={label}>Excluded industries</span>
            <input
              name="excludedIndustries"
              placeholder="Gambling, adult"
              className={input}
            />
          </label>

          <label>
            <span className={label}>Excluded companies</span>
            <input
              name="excludedCompanies"
              placeholder="Example Oy"
              className={input}
            />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>Preferred outreach tone</span>
            <select name="emailTone" defaultValue="Professional" className={input}>
              <option>Professional</option>
              <option>Friendly</option>
              <option>Concise</option>
              <option>Consultative</option>
            </select>
          </label>

          <div className="sm:col-span-2">
            <button className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white">
              Create workspace
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
