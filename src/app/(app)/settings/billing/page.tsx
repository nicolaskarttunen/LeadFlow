import Link from "next/link";
import { startPaidCheckoutAction } from "@/app/choose-plan/actions";
import { getCurrentLocale } from "@/lib/current-locale";
import { requireWorkspace } from "@/lib/workspace";
import {
  BILLING_PLANS,
  EARLY_ACCESS_OFFER,
  PAID_PLAN_IDS,
  earlyAccessMonthlyPrice,
} from "@/lib/billing/plans";
import { getBillingOverview } from "@/lib/billing/subscription";

function progressPercent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatPrice(value: number, fi: boolean) {
  return new Intl.NumberFormat(fi ? "fi-FI" : "en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function BillingSettingsPage() {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  const overview = await getBillingOverview(workspace.id);
  const percent = progressPercent(overview.used, overview.limit);

  // Checkout is enabled in the next phase, after the same Early Access
  // discount has been configured in Stripe.
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

      {EARLY_ACCESS_OFFER.enabled ? (
        <section className="mt-7 rounded-3xl border border-violet-400/25 bg-violet-400/[0.055] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/25 bg-violet-400/[0.1] px-3 py-1 text-xs font-semibold text-violet-200">
                  Early Access
                </span>
                <span className="text-sm font-semibold text-white">
                  -{EARLY_ACCESS_OFFER.discountPercent} % · {EARLY_ACCESS_OFFER.discountedMonths} {fi ? "ensimmäistä kuukautta" : "first months"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {fi
                  ? `Ensimmäisille ${EARLY_ACCESS_OFFER.maxPaidCustomers} maksavalle asiakkaalle tai 31.12.2026 asti, kumpi täyttyy ensin.`
                  : `For the first ${EARLY_ACCESS_OFFER.maxPaidCustomers} paying customers or until December 31, 2026, whichever comes first.`}
              </p>
            </div>
            <div className="text-xs text-slate-500">
              {fi ? "Sen jälkeen normaali kuukausihinta" : "Standard monthly price after the offer"}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-9 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{fi ? "Valitse paketti" : "Choose a plan"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {fi ? "Avaa paketin tiedot nähdäksesi tarkalleen, mitä siihen kuuluu." : "Expand a plan to see exactly what is included."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-3">
        {PAID_PLAN_IDS.map((planId) => {
          const plan = BILLING_PLANS[planId];
          const highlighted = planId === "GROWTH";
          const included = fi ? plan.featuresFi : plan.featuresEn;
          const notIncluded = fi ? plan.notIncludedFi : plan.notIncludedEn;
          const earlyPrice = earlyAccessMonthlyPrice(plan.priceMonthlyEur);

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 ${highlighted ? "border-violet-400/35 bg-violet-400/[0.055]" : "border-white/10 bg-white/[0.025]"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {highlighted ? (
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.1] px-2.5 py-1 text-[11px] font-medium text-violet-200">
                      {fi ? "Suosituin" : "Most popular"}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                    Early Access -{EARLY_ACCESS_OFFER.discountPercent} %
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-semibold text-white">{formatPrice(earlyPrice, fi)} €</span>
                  <span className="pb-1 text-sm text-slate-500">/{fi ? "kk" : "mo"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  <span className="line-through">{formatPrice(plan.priceMonthlyEur, fi)} €/{fi ? "kk" : "mo"}</span>
                  <span className="ml-2 text-slate-400">
                    {fi
                      ? `ensimmäiset ${EARLY_ACCESS_OFFER.discountedMonths} kk, sitten ${formatPrice(plan.priceMonthlyEur, fi)} €/kk`
                      : `first ${EARLY_ACCESS_OFFER.discountedMonths} months, then ${formatPrice(plan.priceMonthlyEur, fi)} €/mo`}
                  </span>
                </div>
              </div>

              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                {fi ? plan.descriptionFi : plan.descriptionEn}
              </p>

              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3">
                <div className="text-sm font-semibold text-slate-100">
                  {plan.verifiedLeadLimit} {fi ? "varmennettua liidiä / kk" : "verified leads / month"}
                </div>
              </div>

              <details className="group mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.035] [&::-webkit-details-marker]:hidden">
                  <span>{fi ? "Näytä kaikki ominaisuudet" : "Show all features"}</span>
                  <span className="text-base text-slate-500 transition-transform duration-200 group-open:rotate-180">⌄</span>
                </summary>

                <div className="border-t border-white/[0.07] px-4 pb-4 pt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
                    {fi ? "Sisältyy" : "Included"}
                  </div>
                  <ul className="mt-3 space-y-2.5 text-sm leading-5 text-slate-300">
                    {included.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <span className="mt-0.5 shrink-0 text-emerald-300">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {notIncluded.length > 0 ? (
                    <div className="mt-5 border-t border-white/[0.07] pt-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {fi ? "Ei sisälly" : "Not included"}
                      </div>
                      <ul className="mt-3 space-y-2.5 text-sm leading-5 text-slate-500">
                        {notIncluded.map((feature) => (
                          <li key={feature} className="flex gap-2.5">
                            <span className="mt-0.5 shrink-0">—</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-violet-400/15 bg-violet-400/[0.05] px-3.5 py-3 text-xs leading-5 text-violet-200">
                      {fi ? "Pro sisältää LeadFlow'n koko suunnitellun ominaisuuspaketin ja korkeimmat käyttörajat." : "Pro includes the full planned LeadFlow feature set and the highest usage limits."}
                    </div>
                  )}
                </div>
              </details>

              <form action={startPaidCheckoutAction} className="mt-5">
                <input type="hidden" name="planId" value={plan.id} />
                <button
                  disabled={!stripeReady}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${highlighted ? "bg-violet-500 text-white hover:bg-violet-400" : "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {stripeReady
                    ? (fi ? `Valitse ${plan.name}` : `Choose ${plan.name}`)
                    : (fi ? "Maksaminen kytketään seuraavaksi" : "Checkout setup next")}
                </button>
              </form>
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
