"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getGoogleSender, googleAccessToken, sendGmailMessage } from "@/lib/email/gmail-send";
import { requireWorkspace } from "@/lib/workspace";

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export type EditEmailDraftState = { error: string | null; saved: boolean };

export async function saveEmailDraftEditsAction(
  draftId: string,
  _previousState: EditEmailDraftState,
  formData: FormData,
): Promise<EditEmailDraftState> {
  const { user, workspace } = await requireWorkspace();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!subject || subject.length > 180 || /[\r\n]/.test(subject)) {
    return { error: "Kirjoita aihe, jonka pituus on enintään 180 merkkiä.", saved: false };
  }
  if (body.length < 20 || body.length > 5000) {
    return { error: "Kirjoita viesti, jonka pituus on 20–5000 merkkiä.", saved: false };
  }

  const draft = await prisma.emailDraft.findFirst({
    where: {
      id: draftId,
      workspaceId: workspace.id,
      status: { in: ["DRAFT", "NEEDS_REVIEW", "APPROVED"] },
    },
    select: { id: true, leadId: true, status: true, subject: true, body: true },
  });
  if (!draft) return { error: "Luonnosta ei voi enää muokata.", saved: false };
  const alreadySentOrQueued = await prisma.emailMessage.findFirst({
    where: { workspaceId: workspace.id, draftId },
    select: { id: true },
  });
  if (alreadySentOrQueued) return { error: "Lähetykseen liittyvää luonnosta ei voi enää muokata.", saved: false };

  if (draft.subject === subject && draft.body === body) {
    return { error: null, saved: true };
  }

  const updated = await prisma.emailDraft.updateMany({
    where: {
      id: draft.id,
      workspaceId: workspace.id,
      status: { in: ["DRAFT", "NEEDS_REVIEW", "APPROVED"] },
    },
    data: {
      subject,
      body,
      status: "NEEDS_REVIEW",
      // Human-edited text has no calibrated AI confidence or guaranteed
      // correspondence to the originally generated evidence.
      confidence: null,
      personalizationExplanation: null,
      factsUsed: { editedByHuman: true },
    },
  });
  if (updated.count !== 1) return { error: "Luonnoksen tallennus ei onnistunut. Päivitä sivu.", saved: false };
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "email_draft.edited",
      entityType: "email_draft",
      entityId: draft.id,
      metadata: { leadId: draft.leadId, approvalReset: draft.status === "APPROVED" },
    },
  });

  revalidatePath("/outreach");
  revalidatePath(`/leads/${draft.leadId}`);
  return { error: null, saved: true };
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

/**
 * A reserved message is intentionally NOT retried automatically after a Gmail API
 * error: a timeout can mean Gmail accepted the message. This avoids duplicates.
 */
export async function sendApprovedGmailDraftAction(draftId: string) {
  const { user, workspace } = await requireWorkspace();
  if (workspace.sendingPaused) throw new Error("Työtilan lähetykset on keskeytetty.");

  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, workspaceId: workspace.id, status: "APPROVED" },
    include: { lead: { include: {
      contacts: { where: { email: { not: null } }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      replies: { take: 1 },
    } } },
  });
  if (!draft) throw new Error("Hyväksyttyä luonnosta ei löytynyt.");
  if (draft.lead.replies.length || ["REPLIED", "POSITIVE", "MEETING"].includes(draft.lead.status)) {
    throw new Error("Liidille on jo tullut vastaus tai yhteydenotto on edennyt.");
  }
  const contact = draft.lead.contacts.find((item) => item.email);
  const to = contact?.email?.trim();
  if (!contact || !to || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(to)) throw new Error("Kelvollinen vastaanottaja puuttuu.");
  if (!draft.subject.trim() || !draft.body.trim()) throw new Error("Viesti on tyhjä.");
  const blocked = await prisma.suppressionEntry.findUnique({
    where: { workspaceId_emailNormalized: { workspaceId: workspace.id, emailNormalized: normalizedEmail(to) } },
  });
  if (blocked) throw new Error("Vastaanottaja on estolistalla.");

  const { connection, email: from } = await getGoogleSender(workspace.id);
  const token = await googleAccessToken(connection);
  const idempotencyKey = `gmail-outbound:${draft.id}`;
  // Unique DB constraint prevents two clicks or concurrent requests from sending twice.
  const reserved = await prisma.emailMessage.create({
    data: {
      workspaceId: workspace.id, leadId: draft.leadId, contactId: contact.id,
      campaignId: draft.campaignId, draftId: draft.id, direction: "OUTBOUND",
      status: "QUEUED", idempotencyKey, fromEmail: from, toEmail: to,
      subject: draft.subject, body: draft.body,
    },
  }).catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("Tämän luonnoksen lähetys on jo aloitettu. Tarkista lähetyshistoria ennen uutta yritystä.");
    }
    throw error;
  });

  let providerMessageId: string;
  try {
    providerMessageId = await sendGmailMessage(token, from, to, draft.subject, draft.body);
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id, actorUserId: user.id,
        action: "email_message.gmail_send_uncertain",
        entityType: "email_message", entityId: reserved.id,
        metadata: { draftId: draft.id, reason: error instanceof Error ? error.message.slice(0, 250) : "unknown" },
      },
    });
    throw new Error("Gmail-lähetyksen vahvistus epäonnistui. Tarkista Gmailin Lähetetyt-kansio ennen uutta yritystä.");
  }

  const sentAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.emailMessage.update({
      where: { id: reserved.id },
      data: { status: "SENT", providerMessageId, sentAt },
    });
    await tx.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT" } });
    await tx.lead.update({ where: { id: draft.leadId }, data: { status: "CONTACTED" } });
    await tx.emailEvent.create({
      data: { workspaceId: workspace.id, messageId: reserved.id, type: "SENT", occurredAt: sentAt,
        payload: { source: "gmail_api", providerMessageId } },
    });
    await tx.auditLog.create({
      data: { workspaceId: workspace.id, actorUserId: user.id, action: "email_message.gmail_sent",
        entityType: "email_message", entityId: reserved.id,
        metadata: { leadId: draft.leadId, draftId: draft.id, toEmail: to } },
    });
  });
  revalidatePath("/outreach");
  revalidatePath("/leads");
  revalidatePath(`/leads/${draft.leadId}`);
  revalidatePath("/dashboard");
}
