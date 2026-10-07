"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { activateWorkspaceTrial } from "@/lib/billing/subscription";
import { requireWorkspace } from "@/lib/workspace";

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
