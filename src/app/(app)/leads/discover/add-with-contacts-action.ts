"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { normalizeCompanyName, normalizeEmail } from "@/lib/normalize";
import { requireWorkspace } from "@/lib/workspace";
import type { DiscoveredLead } from "@/lib/lead-discovery";
import {
  addDiscoveredLeadsAction,
  type AddDiscoveryState,
} from "@/app/(app)/leads/discover/actions";

function parseSelected(formData: FormData) {
  return formData
    .getAll("selectedLead")
    .map(String)
    .map((raw) => {
      try {
        return JSON.parse(raw) as DiscoveredLead;
      } catch {
        return null;
      }
    })
    .filter((item): item is DiscoveredLead => Boolean(item?.companyName));
}

function usableEmails(lead: DiscoveredLead) {
  const unique = new Set<string>();
  for (const value of lead.publicEmails ?? []) {
    const normalized = normalizeEmail(value);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique).slice(0, 5);
}

export async function addDiscoveredLeadsWithContactsAction(
  previousState: AddDiscoveryState,
  formData: FormData,
): Promise<AddDiscoveryState> {
  const selected = parseSelected(formData);
  const result = await addDiscoveredLeadsAction(previousState, formData);
  if (result.error || selected.length === 0) return result;

  const { user, workspace } = await requireWorkspace();
  let contactsAdded = 0;

  for (const item of selected) {
    const emails = usableEmails(item);
    if (!emails.length) continue;

    const lead = await prisma.lead.findFirst({
      where: {
        workspaceId: workspace.id,
        companyNameNormalized: normalizeCompanyName(item.companyName),
      },
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!lead) continue;

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
        select: { id: true },
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
        hasPrimaryEmail = true;
        emptyPrimary = undefined;
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

    if (emails.length) {
      await prisma.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: user.id,
          action: "lead.public_contacts_enriched",
          entityType: "lead",
          entityId: lead.id,
          metadata: {
            discoveredPublicEmails: emails.length,
            source: "public_website",
          },
        },
      });
    }
  }

  if (contactsAdded > 0) {
    revalidatePath("/leads");
    revalidatePath("/leads/newly-found");
  }

  return result;
}
