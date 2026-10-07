import Link from "next/link";
import { EarlyAccessBanner, PaidPlanCards } from "@/components/billing-plan-cards";
import { getBillingOverview } from "@/lib/billing/subscription";
import { getCurrentLocale } from "@/lib/current-locale";
import { requireWorkspace } from "@/lib/workspace";

function progressPercent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function BillingSettingsPage() {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  const overview = await getBillingOverview(workspace.id);
  const percent = progressPercent(overview.used, overview.limit);

  // Checkout is enabled in the next phase after the Early Access discount
  // has been configured in Stripe as well.
  const stripeReady = false;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/settings" className="text-sm text-slate-400 transition hover:text-white">
        {fi ? "← Takaisin asetuksiin" : "← Back to settings"}
      </Link>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">LeadFlow</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {fi ? "Tilaus ja käyttö" : "Subscription & usage"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {fi
            ? "Seuraa varmennettujen liidien käyttöä ja valitse yrityksellesi sopiva paketti. Laatuhyvitykset palauttavat krediitin, jos LeadFlow toimittaa virheellisen tai asetuksiin sopimattoman liidin."
            : "Track verified lead usage and choose the right plan for your company. Quality refunds return a credit when LeadFlow delivers an incorrect or out-of-profile lead."}
        </p>
      </div>

      <section className="surface mt-7 rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {fi ? "Nykyinen paketti" : "Current plan"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="text-2xl font-semibold text-slate-100">{overview.plan.name}</div>
              {overview.subscription.status === "trialing" ? (
                <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1 text-xs font-medium text-violet-200">
                  {fi ? "Ilmainen kokeilu" : "Free trial"}
                </span>
              ) : null}
            </div>
            {overview.trialDaysRemaining !== null ? (
              <p className="mt-2 text-sm text-slate-400">
                {fi
                  ? `${overview.trialDaysRemaining} päivää kokeilua jäljellä`
                  : `${overview.trialDaysRemaining} trial days remaining`}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 sm:min-w-56">
            <div className="text-xs text-slate-500">{fi ? "Varmennetut liidit" : "Verified leads"}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {overview.used} / {overview.limit}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {fi ? `${overview.remaining} jäljellä` : `${overview.remaining} remaining`}
            </div>
          </div>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        {overview.subscription.status === "trial_expired" ? (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100">
            {fi
              ? "Kokeilu on päättynyt. Aiemmat liidit säilyvät näkyvissä, mutta uusien liidien haku avautuu uudelleen paketin valinnan jälkeen."
              : "Your trial has ended. Existing leads remain available, but new prospecting unlocks after choosing a plan."}
          </div>
        ) : null}
      </section>

      <div className="mt-7">
        <EarlyAccessBanner fi={fi} />
      </div>

      <div className="mt-9">
        <h2 className="text-xl font-semibold text-slate-100">{fi ? "Valitse paketti" : "Choose a plan"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {fi
            ? "Avaa paketin tiedot nähdäksesi tarkalleen, mitä siihen kuuluu."
            : "Expand a plan to see exactly what is included."}
        </p>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-3">
        <PaidPlanCards fi={fi} stripeReady={stripeReady} />
      </div>

      <section className="mt-6 rounded-3xl border border-emerald-400/15 bg-emerald-400/[0.035] p-6">
        <h2 className="font-semibold text-slate-100">{fi ? "Laatuhyvitys" : "Quality credit refund"}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
          {fi
            ? "Jos liidi on väärä yritys, duplikaatti, selvästi asetustesi ulkopuolella tai LeadFlow'n tiedoissa on olennainen virhe, liidikrediitti palautetaan. Jos liidi täyttää asetukset mutta päätät vain olla kontaktoimatta sitä, krediitti jää käytetyksi."
            : "If a lead is the wrong company, a duplicate, clearly outside your profile or contains a material LeadFlow data error, the credit is returned. If the lead matches your profile but you simply choose not to contact it, the credit remains used."}
        </p>
      </section>
    </div>
  );
}
