import { activateTrialAction, startPaidCheckoutAction } from "@/app/choose-plan/actions";
import {
  BILLING_PLANS,
  EARLY_ACCESS_OFFER,
  PAID_PLAN_IDS,
  earlyAccessMonthlyPrice,
} from "@/lib/billing/plans";

function formatPrice(value: number, fi: boolean) {
  return new Intl.NumberFormat(fi ? "fi-FI" : "en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function EarlyAccessBanner({ fi }: { fi: boolean }) {
  if (!EARLY_ACCESS_OFFER.enabled) return null;

  return (
    <section className="rounded-2xl border border-violet-400/25 bg-violet-400/[0.055] px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-400/25 bg-violet-400/[0.1] px-3 py-1 text-xs font-semibold text-violet-200">
              {fi ? "Early Access -avajaistarjous" : "Early Access launch offer"}
            </span>
            <span className="text-sm font-semibold text-white">
              -{EARLY_ACCESS_OFFER.discountPercent} % · {EARLY_ACCESS_OFFER.discountedMonths} {fi ? "ensimmäistä kuukautta" : "first months"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {fi ? "Voimassa 31.12.2026 asti." : "Available until December 31, 2026."}
          </p>
        </div>
      </div>
    </section>
  );
}

export function TrialPlanCard({ fi, canStartTrial }: { fi: boolean; canStartTrial: boolean }) {
  const trial = BILLING_PLANS.TRIAL;

  return (
    <section className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.045] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{fi ? "Ilmainen kokeilu" : "Free trial"}</h2>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
          14 {fi ? "päivää" : "days"}
        </span>
      </div>

      <div className="mt-4 text-3xl font-semibold text-white">0 €</div>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
        {fi ? trial.descriptionFi : trial.descriptionEn}
      </p>

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3 text-sm font-medium text-slate-200">
        {trial.verifiedLeadLimit} {fi ? "varmennettua liidiä" : "verified leads"}
      </div>

      <details className="group mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
          <span>{fi ? "Mitä kokeiluun kuuluu" : "What's included"}</span>
          <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <ul className="space-y-2.5 border-t border-white/[0.07] px-4 py-4 text-sm text-slate-400">
          {(fi ? trial.featuresFi : trial.featuresEn).map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <span className="text-emerald-300">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </details>

      <form action={activateTrialAction} className="mt-6">
        <button
          disabled={!canStartTrial}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canStartTrial
            ? (fi ? "Aloita 14 päivän kokeilu" : "Start 14-day trial")
            : (fi ? "Kokeilu on jo käytetty" : "Trial already used")}
        </button>
      </form>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        {fi ? "Ei maksukorttia · Ei automaattista veloitusta" : "No card · No automatic charge"}
      </p>
    </section>
  );
}

export function PaidPlanCards({ fi, stripeReady }: { fi: boolean; stripeReady: boolean }) {
  return PAID_PLAN_IDS.map((planId) => {
    const plan = BILLING_PLANS[planId];
    const highlighted = planId === "GROWTH";
    const included = fi ? plan.featuresFi : plan.featuresEn;
    const notIncluded = fi ? plan.notIncludedFi : plan.notIncludedEn;
    const earlyPrice = earlyAccessMonthlyPrice(plan.priceMonthlyEur);

    return (
      <section
        key={plan.id}
        className={`rounded-3xl border p-6 ${highlighted ? "border-violet-400/40 bg-violet-400/[0.065] shadow-xl shadow-violet-950/10" : "border-white/10 bg-white/[0.025]"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
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

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3 text-sm font-semibold text-slate-100">
          {plan.verifiedLeadLimit} {fi ? "varmennettua liidiä / kk" : "verified leads / month"}
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
            ) : null}
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
      </section>
    );
  });
}
