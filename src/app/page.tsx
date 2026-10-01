import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">LeadFlow</div>
          <div className="flex gap-3">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="max-w-4xl py-24">
          <div className="mb-5 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">
            Quality over quantity
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-7xl">
            B2B outreach built around real research.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Find, qualify, research and manage relevant prospects without turning
            outreach into mass spam. Every lead has a reason. Every claim should
            have evidence.
          </p>
          <div className="mt-9 flex gap-3">
            <Link
              href={session?.user ? "/dashboard" : "/sign-up"}
              className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30"
            >
              {session?.user ? "Go to dashboard" : "Start building"}
            </Link>
            <a
              href="#foundation"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200"
            >
              See foundation
            </a>
          </div>
        </section>

        <section
          id="foundation"
          className="grid gap-4 border-t border-white/10 py-10 text-sm text-slate-400 sm:grid-cols-3"
        >
          <div>
            <div className="mb-2 font-semibold text-slate-100">Tenant safe</div>
            Workspace access is resolved server-side from verified membership.
          </div>
          <div>
            <div className="mb-2 font-semibold text-slate-100">Traceable</div>
            The schema already separates leads, evidence, research and email history.
          </div>
          <div>
            <div className="mb-2 font-semibold text-slate-100">Provider ready</div>
            Email, AI, discovery and enrichment integrations remain replaceable.
          </div>
        </section>
      </div>
    </main>
  );
}
