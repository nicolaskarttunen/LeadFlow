import { redirect } from "next/navigation";
import { activateTrialAction, startPaidCheckoutAction } from "@/app/choose-plan/actions";
import {
  BILLING_PLANS,
  EARLY_ACCESS_OFFER,
  PAID_PLAN_IDS,
  earlyAccessMonthlyPrice,
} from "@/lib/billing/plans";
import { getBillingOverview } from "@/lib/billing/subscription";
import { getCurrentLocale } from "@/lib/current-locale";
import { requireWorkspace } from "@/lib/workspace";

function formatPrice(value: number, fi: boolean) {
  return new Intl.NumberFormat(fi ? "fi-FI" : "en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ChoosePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  const overview = await getBillingOverview(workspace.id);
  const query = await searchParams;

  if (overview.subscription.status === "active" || overview.subscription.status === "trialing") {
    redirect("/dashboard");
  }

  // Checkout stays intentionally disabled until the Early Access discount is
  // implemented in Stripe as well. This prevents the UI and charged price
  // from ever disagreeing.
  const stripeReady = false;
  const trial = BILLING_PLANS.TRIAL;

  return (
    <main className="min-h-screen px-5 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-semibold text-violet-300">LeadFlow</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
            {fi ? "Valitse tilaus" : "Choose your plan"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base">
            {fi
              ? "Voit aloittaa 14 päivän kokeilun ilman maksukorttia tai valita maksullisen paketin heti. Kokeilu ei muutu automaattisesti maksulliseksi tilaukseksi."
              : "Start a 14-day trial without a payment card or choose a paid plan right away. The trial never converts automatically into a paid subscription."}
          </p>
        </div>

        {EARLY_ACCESS_OFFER.enabled ? (
          <section className="mx-auto mt-7 max-w-4xl rounded-3xl border border-violet-400/25 bg-violet-400/[0.06] px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-400/25 bg-violet-400/[0.1] px-3 py-1 text-xs font-semibold text-violet-200">
                    Early Access
                  </span>
                  <span className="text-sm font-semibold text-white">
                    -{EARLY_ACCESS_OFFER.discountPercent} % · {EARLY_ACCESS_OFFER.discountedMonths} {fi ? "ensimmäistä kuukautta" : "first months"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {fi
                    ? `Early Access -etu on saatavilla ensimmäisille ${EARLY_ACCESS_OFFER.maxPaidCustomers} maksavalle asiakkaalle tai 31.12.2026 asti, kumpi täyttyy ensin.`
                    : `The Early Access offer is available to the first ${EARLY_ACCESS_OFFER.maxPaidCustomers} paying customers or until December 31, 2026, whichever comes first.`}
                </p>
              </div>
              <div className="shrink-0 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-300">
                {fi ? "Sen jälkeen normaali kuukausihinta" : "Standard monthly price after that"}
              </div>
            </div>
          </section>
        ) : null}

        {query.error ? (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100">
            {query.error === "stripe-not-configured"
              ? (fi ? "Stripe-maksamista ei ole vielä kytketty tähän ympäristöön." : "Stripe checkout is not configured in this environment yet.")
              : query.error === "checkout"
                ? (fi ? "Maksusivun avaaminen epäonnistui. Yritä uudelleen." : "Could not open checkout. Please try again.")
                : (fi ? "Pakettia ei voitu valita." : "The plan could not be selected.")}
          </div>
        ) : null}

        {query.checkout === "cancelled" ? (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            {fi ? "Maksu peruttiin. Voit valita paketin uudelleen." : "Checkout was cancelled. You can choose a plan again."}
          </div>
        ) : null}

        <div className="mt-9 grid gap-4 xl:grid-cols-4">
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

            <details className="group mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">
                <span className="flex items-center justify-between gap-3">
                  {fi ? "Mitä kokeiluun kuuluu" : "What's included"}
                  <span className="transition group-open:rotate-180">⌄</span>
                </span>
              </summary>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                {(fi ? trial.featuresFi : trial.featuresEn).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-emerald-300">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </details>

            <form action={activateTrialAction} className="mt-6">
              <button
                disabled={!overview.canStartTrial}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {overview.canStartTrial
                  ? (fi ? "Aloita 14 päivän kokeilu" : "Start 14-day trial")
                  : (fi ? "Kokeilu on jo käytetty" : "Trial already used")}
              </button>
            </form>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              {fi ? "Ei maksukorttia · Ei automaattista veloitusta" : "No card · No automatic charge"}
            </p>
          </section>

          {PAID_PLAN_IDS.map((planId) => {
            const plan = BILLING_PLANS[planId];
            const highlighted = planId === "GROWTH";
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
                  <div className="flex items-end gap-2">
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
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3 text-sm font-medium text-slate-200">
                  {plan.verifiedLeadLimit} {fi ? "varmennettua liidiä / kk" : "verified leads / month"}
                </div>

                <details className="group mt-5 rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">
                    <span className="flex items-center justify-between gap-3">
                      {fi ? "Näytä kaikki ominaisuudet" : "Show all features"}
                      <span className="transition group-open:rotate-180">⌄</span>
                    </span>
                  </summary>
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {fi ? "Sisältyy" : "Included"}
                    </div>
                    <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                      {(fi ? plan.featuresFi : plan.featuresEn).map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <span className="text-emerald-300">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {(fi ? plan.notIncludedFi : plan.notIncludedEn).length ? (
                      <>
                        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {fi ? "Ei sisälly" : "Not included"}
                        </div>
                        <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
                          {(fi ? plan.notIncludedFi : plan.notIncludedEn).map((feature) => (
                            <li key={feature} className="flex gap-2">
                              <span>—</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </details>

                <form action={startPaidCheckoutAction} className="mt-6">
                  <input type="hidden" name="planId" value={plan.id} />
                  <button
                    disabled={!stripeReady}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${highlighted ? "bg-violet-500 text-white hover:bg-violet-400" : "border border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {stripeReady
                      ? (fi ? `Valitse ${plan.name}` : `Choose ${plan.name}`)
                      : (fi ? "Maksaminen kytketään seuraavaksi" : "Checkout setup next")}
                  </button>
                </form>
              </section>
            );
          })}
        </div>

        <div className="mx-auto mt-7 max-w-4xl rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 text-center text-xs leading-5 text-slate-500">
          {fi
            ? `Early Access: -${EARLY_ACCESS_OFFER.discountPercent} % ensimmäiset ${EARLY_ACCESS_OFFER.discountedMonths} kuukautta ensimmäisille ${EARLY_ACCESS_OFFER.maxPaidCustomers} maksavalle asiakkaalle tai 31.12.2026 asti. Trial: 14 päivää tai 20 varmennettua liidiä, kumpi täyttyy ensin.`
            : `Early Access: ${EARLY_ACCESS_OFFER.discountPercent}% off the first ${EARLY_ACCESS_OFFER.discountedMonths} months for the first ${EARLY_ACCESS_OFFER.maxPaidCustomers} paying customers or until December 31, 2026. Trial: 14 days or 20 verified leads, whichever comes first.`}
        </div>
      </div>
    </main>
  );
}
