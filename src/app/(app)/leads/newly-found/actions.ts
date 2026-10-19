"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { scoreLeadAction } from "@/app/(app)/leads/actions";

async function setReviewStatus(leadId: string, reviewStatus: "KEPT" | "REJECTED") {
  const { user, workspace } = await requireWorkspace();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id, reviewStatus: "PENDING" }, select: { id: true } });
  if (!lead) return;
  await prisma.lead.update({ where: { id: lead.id }, data: { reviewStatus, reviewedAt: new Date(), ...(reviewStatus === "REJECTED" ? { status: "DISQUALIFIED" as const } : {}) } });
  await prisma.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: reviewStatus === "KEPT" ? "lead.review_kept" : "lead.review_rejected", entityType: "lead", entityId: lead.id } });
  revalidatePath("/leads/newly-found");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function keepLeadAction(formData: FormData) {
  await setReviewStatus(String(formData.get("leadId") ?? ""), "KEPT");
}

export async function rejectLeadAction(formData: FormData) {
  await setReviewStatus(String(formData.get("leadId") ?? ""), "REJECTED");
}


function scoreThreshold(formData: FormData) {
  const value = Number(formData.get("scoreThreshold"));
  if (!Number.isFinite(value)) return 80;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function bulkReviewByScore(formData: FormData, mode: "KEEP_ABOVE" | "REJECT_BELOW") {
  const { user, workspace } = await requireWorkspace();
  const threshold = scoreThreshold(formData);
  const pending = await prisma.lead.findMany({
    where: { workspaceId: workspace.id, reviewStatus: "PENDING", scores: { some: {} } },
    select: { id: true, scores: { orderBy: { createdAt: "desc" }, take: 1, select: { total: true } } },
  });
  const ids = pending.filter((lead) => {
    const score = lead.scores[0]?.total;
    return score !== undefined && (mode === "KEEP_ABOVE" ? score >= threshold : score < threshold);
  }).map((lead) => lead.id);
  if (!ids.length) return;

  const reviewStatus = mode === "KEEP_ABOVE" ? "KEPT" : "REJECTED";
  await prisma.$transaction(async (tx) => {
    await tx.lead.updateMany({
      where: { workspaceId: workspace.id, id: { in: ids }, reviewStatus: "PENDING" },
      data: { reviewStatus, reviewedAt: new Date(), ...(reviewStatus === "REJECTED" ? { status: "DISQUALIFIED" as const } : {}) },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: mode === "KEEP_ABOVE" ? "lead.bulk_review_kept" : "lead.bulk_review_rejected",
        entityType: "lead",
        metadata: { threshold, count: ids.length },
      },
    });
  });
  revalidatePath("/leads/newly-found");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function keepLeadsAboveScoreAction(formData: FormData) {
  await bulkReviewByScore(formData, "KEEP_ABOVE");
}

export async function rejectLeadsBelowScoreAction(formData: FormData) {
  await bulkReviewByScore(formData, "REJECT_BELOW");
}

/** Re-evaluate already researched pending leads using the current Sales Profile. */
export async function rescorePendingLeadsAction() {
  const { workspace } = await requireWorkspace();
  const pending = await prisma.lead.findMany({
    where: {
      workspaceId: workspace.id,
      reviewStatus: "PENDING",
      researchRecords: { some: { status: "COMPLETE" } },
    },
    select: { id: true },
    orderBy: { discoveredAt: "desc" },
    take: 25,
  });

  for (const lead of pending) {
    try {
      await scoreLeadAction(lead.id);
    } catch (error) {
      console.error("Pending lead rescoring failed", { leadId: lead.id, error });
    }
  }

  revalidatePath("/leads/newly-found");
  revalidatePath("/dashboard");
}
