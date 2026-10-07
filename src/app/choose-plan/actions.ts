"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BILLING_PLANS, type BillingPlanId } from "@/lib/billing/plans";
import { activateWorkspaceTrial } from "@/lib/billing/subscription";
import { requireWorkspace } from "@/lib/workspace";

const PAID_PLANS: BillingPlanId[] = ["STARTER", "GROWTH", "PRO"];

export async function activateTrialAction() {
  const { user, workspace } = await requireWorkspace();
  const subscription = await activateWorkspaceTrial(workspace.id);

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "subscription.trial_started",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: {
        plan: subscription.plan,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      },
    },
  });

  redirect("/dashboard");
}

export async function startPaidCheckoutAction(formData: FormData) {
  const { user, workspace } = await requireWorkspace();
  const planId = String(formData.get("planId") ?? "").toUpperCase() as BillingPlanId;

  if (!PAID_PLANS.includes(planId)) {
    redirect("/choose-plan?error=invalid-plan");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    redirect("/choose-plan?error=stripe-not-configured");
  }

  const plan = BILLING_PLANS[planId];
  const baseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("success_url", `${baseUrl}/dashboard?checkout=success`);
  body.set("cancel_url", `${baseUrl}/choose-plan?checkout=cancelled`);
  body.set("customer_email", user.email);
  body.set("client_reference_id", workspace.id);
  body.set("metadata[workspaceId]", workspace.id);
  body.set("metadata[plan]", plan.id);
  body.set("subscription_data[metadata][workspaceId]", workspace.id);
  body.set("subscription_data[metadata][plan]", plan.id);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "eur");
  body.set("line_items[0][price_data][unit_amount]", String(plan.priceMonthlyEur * 100));
  body.set("line_items[0][price_data][recurring][interval]", "month");
  body.set("line_items[0][price_data][product_data][name]", `LeadFlow ${plan.name}`);
  body.set(
    "line_items[0][price_data][product_data][description]",
    `${plan.verifiedLeadLimit} verified leads per month`,
  );

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = await response.json() as { url?: string; error?: { message?: string } };

  if (!response.ok || !payload.url) {
    console.error("Stripe checkout creation failed", {
      workspaceId: workspace.id,
      planId,
      status: response.status,
      message: payload.error?.message,
    });
    redirect("/choose-plan?error=checkout");
  }

  redirect(payload.url);
}
