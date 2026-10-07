"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function approveEmailDraftAction(draftId: string) {
  const { user, workspace } = await requireWorkspace();

  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, workspaceId: workspace.id },
    select: { id: true, leadId: true, status: true },
  });

  if (!draft) return;
  if (draft.status === "SENT" || draft.status === "REPLIED") return;

  await prisma.$transaction([
    prisma.emailDraft.update({
      where: { id: draft.id },
      data: { status: "APPROVED" },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "email_draft.approved",
        entityType: "email_draft",
        entityId: draft.id,
        metadata: { leadId: draft.leadId },
      },
    }),
  ]);

  revalidatePath("/outreach");
  revalidatePath(`/leads/${draft.leadId}`);
}

export async function rejectEmailDraftAction(draftId: string) {
  const { user, workspace } = await requireWorkspace();

  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, workspaceId: workspace.id },
    select: { id: true, leadId: true, status: true },
  });

  if (!draft || draft.status === "SENT" || draft.status === "REPLIED") return;

  await prisma.$transaction([
    prisma.emailDraft.update({
      where: { id: draft.id },
      data: { status: "REJECTED" },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "email_draft.rejected",
        entityType: "email_draft",
        entityId: draft.id,
        metadata: { leadId: draft.leadId },
      },
    }),
  ]);

  revalidatePath("/outreach");
  revalidatePath(`/leads/${draft.leadId}`);
}

export async function markEmailDraftSentAction(draftId: string) {
  const { user, workspace } = await requireWorkspace();

  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, workspaceId: workspace.id },
    include: {
      lead: {
        include: {
          contacts: {
            where: { email: { not: null } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!draft || draft.status !== "APPROVED") return;

  const contact = draft.lead.contacts.find((item) => item.email);
  const email = contact?.email?.trim();
  if (!contact || !email) return;

  const emailNormalized = normalizedEmail(email);
  const suppressed = await prisma.suppressionEntry.findUnique({
    where: {
      workspaceId_emailNormalized: {
        workspaceId: workspace.id,
        emailNormalized,
      },
    },
    select: { id: true },
  });

  if (suppressed) return;

  const idempotencyKey = `manual-outbound:${draft.id}`;
  const alreadyRecorded = await prisma.emailMessage.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });

  if (alreadyRecorded) return;

  const sentAt = new Date();
  const keepAdvancedLeadStatus = ["REPLIED", "POSITIVE", "MEETING"].includes(draft.lead.status);

  await prisma.$transaction(async (tx) => {
    const message = await tx.emailMessage.create({
      data: {
        workspaceId: workspace.id,
        leadId: draft.leadId,
        contactId: contact.id,
        campaignId: draft.campaignId,
        draftId: draft.id,
        direction: "OUTBOUND",
        status: "SENT",
        idempotencyKey,
        toEmail: email,
        subject: draft.subject,
        body: draft.body,
        sentAt,
      },
    });

    await tx.emailDraft.update({
      where: { id: draft.id },
      data: { status: "SENT" },
    });

    if (!keepAdvancedLeadStatus) {
      await tx.lead.update({
        where: { id: draft.leadId },
        data: { status: "CONTACTED" },
      });
    }

    await tx.emailEvent.create({
      data: {
        workspaceId: workspace.id,
        messageId: message.id,
        type: "SENT",
        occurredAt: sentAt,
        payload: { source: "manual_tracking" },
      },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "email_message.manually_recorded_sent",
        entityType: "email_message",
        entityId: message.id,
        metadata: {
          leadId: draft.leadId,
          draftId: draft.id,
          contactId: contact.id,
          toEmail: email,
        },
      },
    });
  });

  revalidatePath("/outreach");
  revalidatePath("/leads");
  revalidatePath(`/leads/${draft.leadId}`);
  revalidatePath("/dashboard");
}
