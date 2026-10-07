import { createHmac, timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { BILLING_PLANS, type BillingPlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

const PAID_PLANS: BillingPlanId[] = ["STARTER", "GROWTH", "PRO"];
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function isPaidPlan(value: unknown): value is BillingPlanId {
  return typeof value === "string" && PAID_PLANS.includes(value.toUpperCase() as BillingPlanId);
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));

  if (!timestamp || !signatures.length) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    try {
      const receivedBuffer = Buffer.from(signature, "hex");
      return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}

function dateFromUnix(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : undefined;
}

function addOneMonth(date: Date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

function stripeId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

async function activateFromCheckout(object: Record<string, unknown>) {
  const metadata = object.metadata as Record<string, unknown> | null | undefined;
  const workspaceId = typeof metadata?.workspaceId === "string" ? metadata.workspaceId : null;
  const rawPlan = typeof metadata?.plan === "string" ? metadata.plan.toUpperCase() : null;
  if (!workspaceId || !isPaidPlan(rawPlan)) return;

  const plan = BILLING_PLANS[rawPlan];
  const now = new Date();
  const stripeCustomerId = stripeId(object.customer);
  const stripeSubscriptionId = stripeId(object.subscription);

  const subscription = await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      plan: plan.id,
      status: "active",
      quotas: { verifiedLeadLimit: plan.verifiedLeadLimit },
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: addOneMonth(now),
    },
    create: {
      workspaceId,
      plan: plan.id,
      status: "active",
      quotas: { verifiedLeadLimit: plan.verifiedLeadLimit },
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: addOneMonth(now),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId,
      action: "subscription.checkout_completed",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: {
        plan: plan.id,
        stripeCustomerId,
        stripeSubscriptionId,
      },
    },
  });
}

async function syncStripeSubscription(object: Record<string, unknown>) {
  const metadata = object.metadata as Record<string, unknown> | null | undefined;
  const subscriptionId = stripeId(object.id);
  const metadataWorkspaceId = typeof metadata?.workspaceId === "string" ? metadata.workspaceId : null;
  const rawPlan = typeof metadata?.plan === "string" ? metadata.plan.toUpperCase() : null;

  const existing = metadataWorkspaceId
    ? await prisma.subscription.findUnique({ where: { workspaceId: metadataWorkspaceId } })
    : subscriptionId
      ? await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
      : null;

  const workspaceId = metadataWorkspaceId ?? existing?.workspaceId ?? null;
  if (!workspaceId) return;

  const planId = isPaidPlan(rawPlan) ? rawPlan : isPaidPlan(existing?.plan) ? existing.plan as BillingPlanId : null;
  if (!planId) return;

  const plan = BILLING_PLANS[planId];
  const stripeStatus = typeof object.status === "string" ? object.status : "active";
  const status = stripeStatus === "active" || stripeStatus === "trialing" ? "active" : stripeStatus;
  const currentPeriodStart = dateFromUnix(object.current_period_start);
  const currentPeriodEnd = dateFromUnix(object.current_period_end);

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      plan: plan.id,
      status,
      quotas: { verifiedLeadLimit: plan.verifiedLeadLimit },
      stripeCustomerId: stripeId(object.customer) ?? existing?.stripeCustomerId,
      stripeSubscriptionId: subscriptionId ?? existing?.stripeSubscriptionId,
      ...(currentPeriodStart ? { currentPeriodStart } : {}),
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
    },
    create: {
      workspaceId,
      plan: plan.id,
      status,
      quotas: { verifiedLeadLimit: plan.verifiedLeadLimit },
      stripeCustomerId: stripeId(object.customer),
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart: currentPeriodStart ?? new Date(),
      currentPeriodEnd: currentPeriodEnd ?? addOneMonth(new Date()),
    },
  });
}

async function cancelStripeSubscription(object: Record<string, unknown>) {
  const subscriptionId = stripeId(object.id);
  if (!subscriptionId) return;

  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
  if (!existing) return;

  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "canceled",
      currentPeriodEnd: dateFromUnix(object.current_period_end) ?? existing.currentPeriodEnd,
    },
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Stripe webhook secret is not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const object = event.data?.object;
  if (!event.type || !object) return Response.json({ received: true });

  try {
    if (event.type === "checkout.session.completed") {
      await activateFromCheckout(object);
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      await syncStripeSubscription(object);
    } else if (event.type === "customer.subscription.deleted") {
      await cancelStripeSubscription(object);
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", { type: event.type, error });
    return new Response("Webhook processing failed", { status: 500 });
  }

  return Response.json({ received: true });
}
