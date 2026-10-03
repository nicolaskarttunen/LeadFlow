"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

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
