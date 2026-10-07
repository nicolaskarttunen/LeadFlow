import prisma from "@/lib/prisma";
import { BILLING_PLANS, getBillingPlan } from "./plans";

const VERIFIED_LEAD_USAGE_METRIC = "verified_leads_used";

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function trialWindow() {
  const now = new Date();
  const trial = BILLING_PLANS.TRIAL;
  return {
    now,
    trial,
    periodEnd: addDays(now, trial.trialDays ?? 14),
  };
}

export async function ensureWorkspaceSubscription(workspaceId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (existing) {
    const isUninitializedLegacySubscription = existing.status === "inactive"
      && !existing.stripeCustomerId
      && !existing.stripeSubscriptionId
      && !existing.currentPeriodStart
      && !existing.currentPeriodEnd;

    if (!isUninitializedLegacySubscription) return existing;

    const { now, trial, periodEnd } = trialWindow();
    return prisma.subscription.update({
      where: { workspaceId },
      data: {
        plan: trial.id,
        status: "trialing",
        quotas: {
          verifiedLeadLimit: trial.verifiedLeadLimit,
          trialDays: trial.trialDays ?? 14,
        },
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  const { now, trial, periodEnd } = trialWindow();

  return prisma.subscription.create({
    data: {
      workspaceId,
      plan: trial.id,
      status: "trialing",
      quotas: {
        verifiedLeadLimit: trial.verifiedLeadLimit,
        trialDays: trial.trialDays ?? 14,
      },
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

export async function getBillingOverview(workspaceId: string) {
  let subscription = await ensureWorkspaceSubscription(workspaceId);
  const now = new Date();

  if (
    subscription.status === "trialing"
    && subscription.currentPeriodEnd
    && subscription.currentPeriodEnd <= now
  ) {
    subscription = await prisma.subscription.update({
      where: { workspaceId },
      data: { status: "trial_expired" },
    });
  }

  const plan = getBillingPlan(subscription.plan);
  const periodStart = subscription.currentPeriodStart ?? subscription.createdAt;

  const usage = await prisma.usageRecord.findFirst({
    where: {
      workspaceId,
      periodStart,
      metric: VERIFIED_LEAD_USAGE_METRIC,
    },
    select: { quantity: true },
  });

  const used = Math.max(0, usage?.quantity ?? 0);
  const limit = plan.verifiedLeadLimit;
  const remaining = Math.max(0, limit - used);
  const trialDaysRemaining = subscription.status === "trialing" && subscription.currentPeriodEnd
    ? Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000))
    : null;

  return {
    subscription,
    plan,
    used,
    limit,
    remaining,
    trialDaysRemaining,
    canProspect: subscription.status === "active" || (subscription.status === "trialing" && remaining > 0),
  };
}

export async function incrementVerifiedLeadUsage(workspaceId: string, quantity: number) {
  if (quantity <= 0) return getBillingOverview(workspaceId);

  const subscription = await ensureWorkspaceSubscription(workspaceId);
  const periodStart = subscription.currentPeriodStart ?? subscription.createdAt;

  await prisma.usageRecord.upsert({
    where: {
      workspaceId_periodStart_metric: {
        workspaceId,
        periodStart,
        metric: VERIFIED_LEAD_USAGE_METRIC,
      },
    },
    update: {
      quantity: { increment: quantity },
    },
    create: {
      workspaceId,
      periodStart,
      metric: VERIFIED_LEAD_USAGE_METRIC,
      quantity,
    },
  });

  return getBillingOverview(workspaceId);
}

export async function refundVerifiedLeadUsage(workspaceId: string, quantity: number) {
  if (quantity <= 0) return getBillingOverview(workspaceId);

  const subscription = await ensureWorkspaceSubscription(workspaceId);
  const periodStart = subscription.currentPeriodStart ?? subscription.createdAt;

  const current = await prisma.usageRecord.findFirst({
    where: {
      workspaceId,
      periodStart,
      metric: VERIFIED_LEAD_USAGE_METRIC,
    },
  });

  if (!current) return getBillingOverview(workspaceId);

  await prisma.usageRecord.update({
    where: { id: current.id },
    data: {
      quantity: Math.max(0, current.quantity - quantity),
    },
  });

  return getBillingOverview(workspaceId);
}
