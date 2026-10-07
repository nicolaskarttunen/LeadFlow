import { redirect } from "next/navigation";
import {
  EarlyAccessBanner,
  PaidPlanCards,
  TrialPlanCard,
} from "@/components/billing-plan-cards";
import { getBillingOverview } from "@/lib/billing/subscription";
import { getCurrentLocale } from "@/lib/current-locale";
import { requireWorkspace } from "@/lib/workspace";

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

  // Checkout remains locked until the same Early Access discount is wired
  // into Stripe. This prevents the displayed and charged prices from differing.
  const stripeReady = false;

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

        <div className="mx-auto mt-7 max-w-4xl">
          <EarlyAccessBanner fi={fi} />
        </div>

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
          <TrialPlanCard fi={fi} canStartTrial={overview.canStartTrial} />
          <PaidPlanCards fi={fi} stripeReady={stripeReady} />
        </div>

        <p className="mx-auto mt-7 max-w-4xl text-center text-xs leading-5 text-slate-500">
          {fi
            ? "Trial: 14 päivää tai 20 varmennettua liidiä, kumpi täyttyy ensin. Early Access -avajaistarjous on voimassa 31.12.2026 asti."
            : "Trial: 14 days or 20 verified leads, whichever comes first. The Early Access launch offer is available until December 31, 2026."}
        </p>
      </div>
    </main>
  );
}
