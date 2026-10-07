"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize";
import { requireWorkspace } from "@/lib/workspace";
import { researchPublicWebsite } from "@/lib/lead-research/website-research";
import { scoreLeadAction } from "@/app/(app)/leads/actions";

function hostnameFromWebsite(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function emailDomain(value: string) {
  return value.split("@")[1]?.toLowerCase() ?? null;
}

function chooseEmails(emails: string[], website: string) {
  const normalized = Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );

  const host = hostnameFromWebsite(website);
  if (!host) return normalized.slice(0, 3);

  const sameDomain = normalized.filter((email) => {
    const domain = emailDomain(email);
    return domain === host || Boolean(domain?.endsWith(`.${host}`));
  });

  if (sameDomain.length) return sameDomain.slice(0, 3);
  return normalized.length === 1 ? normalized : [];
}

export async function enrichLeadContactsAction(leadId: string) {
  const { user, workspace } = await requireWorkspace();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId: workspace.id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!lead) throw new Error("Lead not found.");
  if (!lead.website) throw new Error("Lead does not have a website to research.");

  const research = await researchPublicWebsite(lead.website);
  const emails = chooseEmails(research.emails, research.finalUrl);

  let contactsAdded = 0;
  let hasPrimaryEmail = lead.contacts.some(
    (contact) => contact.isPrimary && Boolean(contact.emailNormalized),
  );
  let emptyPrimary = lead.contacts.find(
    (contact) => contact.isPrimary && !contact.emailNormalized,
  );

  for (const email of emails) {
    const duplicate = await prisma.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        emailNormalized: email,
      },
      select: { id: true, leadId: true },
    });

    if (duplicate) continue;

    if (!hasPrimaryEmail && emptyPrimary) {
      await prisma.contact.update({
        where: { id: emptyPrimary.id },
        data: {
          email,
          emailNormalized: email,
          emailKey: `${workspace.id}:${email}`,
        },
      });
      emptyPrimary = undefined;
      hasPrimaryEmail = true;
      contactsAdded += 1;
      continue;
    }

    await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        leadId: lead.id,
        email,
        emailNormalized: email,
        emailKey: `${workspace.id}:${email}`,
        isPrimary: !hasPrimaryEmail,
      },
    });

    hasPrimaryEmail = true;
    contactsAdded += 1;
  }

  for (const item of research.emailSources) {
    const normalized = normalizeEmail(item.email);
    if (!normalized || !emails.includes(normalized)) continue;

    const existingEvidence = await prisma.researchEvidence.findFirst({
      where: {
        workspaceId: workspace.id,
        leadId: lead.id,
        type: "public_email",
        description: { contains: normalized },
      },
      select: { id: true },
    });

    if (!existingEvidence) {
      await prisma.researchEvidence.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          type: "public_email",
          description: `Public email found on website: ${normalized}`,
          sourceUrl: item.sourceUrl,
          confidence: 90,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "lead.public_contacts_enriched",
      entityType: "lead",
      entityId: lead.id,
      metadata: {
        website: research.finalUrl,
        emailsDetected: research.emails.length,
        acceptedEmails: emails.length,
        contactsAdded,
      },
    },
  });

  if (contactsAdded > 0) {
    try {
      await scoreLeadAction(lead.id);
    } catch (error) {
      console.error("Lead rescore after contact enrichment failed", { leadId: lead.id, error });
    }
  }

  revalidatePath("/leads");
  revalidatePath("/leads/newly-found");
  revalidatePath(`/leads/${lead.id}`);
}
