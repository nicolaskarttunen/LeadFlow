import Link from "next/link";
import { getCurrentLocale } from "@/lib/current-locale";
import { requireWorkspace } from "@/lib/workspace";
import { BILLING_PLANS, PAID_PLAN_IDS } from "@/lib/billing/plans";
import { getBillingOverview } from "@/lib/billing/subscription";

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

      <div className="mt-9 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{fi ? "Valitse paketti" : "Choose a plan"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {fi ? "Hinnat ovat kuukausihintoja. Stripe-maksaminen kytketään seuraavassa vaiheessa." : "Prices are monthly. Stripe checkout will be connected in the next step."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {PAID_PLAN_IDS.map((planId) => {
          const plan = BILLING_PLANS[planId];
          const highlighted = planId === "GROWTH";
          return (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 ${highlighted ? "border-violet-400/35 bg-violet-400/[0.055]" : "border-white/10 bg-white/[0.025]"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
                {highlighted ? (
                  <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.1] px-2.5 py-1 text-[11px] font-medium text-violet-200">
                    {fi ? "Suosituin" : "Most popular"}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-semibold text-white">{plan.priceMonthlyEur} €</span>
                <span className="pb-1 text-sm text-slate-500">/{fi ? "kk" : "mo"}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {fi ? plan.descriptionFi : plan.descriptionEn}
              </p>
              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3">
                <div className="text-sm font-medium text-slate-200">
                  {plan.verifiedLeadLimit} {fi ? "varmennettua liidiä / kk" : "verified leads / month"}
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-400">
                {(fi ? plan.featuresFi : plan.featuresEn).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-emerald-300">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold ${highlighted ? "bg-violet-500 text-white" : "border border-white/10 bg-white/[0.04] text-slate-200"} cursor-not-allowed opacity-60`}
              >
                {fi ? "Maksaminen tulossa" : "Checkout coming next"}
              </button>
            </div>
          );
        })}
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
