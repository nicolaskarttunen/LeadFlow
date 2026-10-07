import { redirect } from "next/navigation";
import { activateTrialAction } from "@/app/start-trial/actions";
import { getCurrentLocale } from "@/lib/current-locale";
import { getBillingOverview } from "@/lib/billing/subscription";
import { requireWorkspace } from "@/lib/workspace";

export default async function StartTrialPage() {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  const overview = await getBillingOverview(workspace.id);

  if (!overview.canStartTrial) {
    redirect("/dashboard");
  }

  const included = fi
    ? [
        "20 varmennettua liidiä",
        "Yritystutkimus ja ostosignaalit",
        "Verkkosivuanalyysi",
        "Julkisten sähköpostien ja puhelinnumeroiden rikastus",
        "AI Copilot",
        "AI-sähköpostiluonnokset",
        "Laatuhyvitykset virheellisistä tai profiiliin sopimattomista liideistä",
      ]
    : [
        "20 verified leads",
        "Company research and buying signals",
        "Website analysis",
        "Public email and phone enrichment",
        "AI Copilot",
        "AI email drafts",
        "Quality credit refunds for incorrect or out-of-profile leads",
      ];

  return (
    <main className="min-h-screen px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-violet-400/20 bg-white/[0.035] p-6 shadow-2xl shadow-black/25 sm:p-9">
          <div className="text-sm font-semibold text-violet-300">LeadFlow</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            {fi ? "Aloita 14 päivän ilmainen kokeilu" : "Start your 14-day free trial"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            {fi
              ? "Kokeilu alkaa vasta, kun painat alla olevaa painiketta. Maksukorttia ei tarvita eikä kokeilu muutu automaattisesti maksulliseksi tilaukseksi."
              : "Your trial starts only when you press the button below. No payment card is required and the trial will not automatically become a paid subscription."}
          </p>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {fi ? "Kokeiluun sisältyy" : "Included in your trial"}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {included.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm leading-5 text-slate-300">
                  <span className="text-emerald-300">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] px-4 py-3 text-sm leading-6 text-slate-300">
            {fi
              ? "Automaattinen jatkuva prospektointi kuuluu trialin suunniteltuun Growth-tason kokemukseen. Se otetaan käyttöön trialissa heti, kun ajastettu prospektointi on valmis beta-versioon."
              : "Continuous automatic prospecting is part of the planned Growth-level trial experience. It will be enabled in the trial once scheduled prospecting is ready for beta."}
          </div>

          <form action={activateTrialAction} className="mt-7">
            <button className="w-full rounded-xl bg-violet-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-400 sm:text-base">
              {fi ? "Aloita ilmainen kokeilu" : "Start free trial"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            {fi
              ? "14 päivää tai 20 varmennettua liidiä — kumpi täyttyy ensin."
              : "14 days or 20 verified leads — whichever comes first."}
          </p>
        </div>
      </div>
    </main>
  );
}
