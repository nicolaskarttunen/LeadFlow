"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize";
import { selectBusinessEmails } from "@/lib/lead-research/public-contact-selection";
import { researchPublicWebsite } from "@/lib/lead-research/website-research";
import { requireWorkspace } from "@/lib/workspace";
import { scoreLeadAction } from "@/app/(app)/leads/actions";

export type PublicContactEnrichmentState = {
  message: string | null;
  error: string | null;
};

export async function findLeadPublicEmailsAction(
  leadId: string,
  _previousState: PublicContactEnrichmentState,
  _formData: FormData,
): Promise<PublicContactEnrichmentState> {
  const { user, workspace } = await requireWorkspace();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId: workspace.id },
    select: {
      id: true,
      companyName: true,
      website: true,
      contacts: {
        select: { id: true, email: true, emailNormalized: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      researchRecords: {
        where: { status: "COMPLETE" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!lead) return { error: "Liidiä ei löytynyt.", message: null };
  if (!lead.website) {
    return {
      error: "Yritykselle ei ole vahvistettua verkkosivua. Lisää oikea verkkosivu ennen yhteystietojen hakua.",
      message: null,
    };
  }

  let research: Awaited<ReturnType<typeof researchPublicWebsite>>;
  try {
    research = await researchPublicWebsite(lead.website);
  } catch (error) {
    console.error("Lead public contact lookup failed", { leadId, error });
    return {
      error: "Yrityksen verkkosivua ei voitu tutkia. Tarkista verkkosivun osoite ja yritä myöhemmin.",
      message: null,
    };
  }

  const emails = selectBusinessEmails(
    research.emails,
    research.finalUrl,
    research.mailtoEmails,
  );
  let created = 0;
  let alreadyKnown = 0;
  let assignedToOtherLead = 0;

  for (const email of emails) {
    const normalized = normalizeEmail(email);
    const existing = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, emailNormalized: normalized },
      select: { leadId: true },
    });
    if (existing) {
      if (existing.leadId === lead.id) alreadyKnown += 1;
      else assignedToOtherLead += 1;
      continue;
    }

    try {
      const emptyPrimary = lead.contacts.find((contact) => contact.isPrimary && !contact.emailNormalized);
      const hasPrimaryEmail = lead.contacts.some((contact) => contact.isPrimary && Boolean(contact.emailNormalized));

      if (emptyPrimary && !hasPrimaryEmail) {
        await prisma.contact.update({
          where: { id: emptyPrimary.id },
          data: {
            email,
            emailNormalized: normalized,
            emailKey: `${workspace.id}:${normalized}`,
            emailVerificationStatus: "UNKNOWN",
          },
        });
        // Update local copy so later emails are added as secondary contacts.
        emptyPrimary.email = email;
        emptyPrimary.emailNormalized = normalized;
      } else {
        await prisma.contact.create({
          data: {
            workspaceId: workspace.id,
            leadId: lead.id,
            email,
            emailNormalized: normalized,
            emailKey: `${workspace.id}:${normalized}`,
            emailVerificationStatus: "UNKNOWN",
            isPrimary: !hasPrimaryEmail,
          },
        });
        lead.contacts.push({
          id: "new-" + normalized,
          email,
          emailNormalized: normalized,
          isPrimary: !hasPrimaryEmail,
        });
      }
      created += 1;

      const sourceUrl = research.emailSources.find((item) => item.email === email)?.sourceUrl ?? research.finalUrl;
      await prisma.researchEvidence.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          researchRecordId: lead.researchRecords[0]?.id ?? null,
          type: "public_email",
          description: `Yrityksen verkkosivulla julkaistu sähköpostiosoite: ${email}`,
          sourceUrl,
          confidence: 70,
        },
      });
    } catch (error) {
      // A simultaneous enrichment can insert the same email. Do not overwrite it.
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        alreadyKnown += 1;
        continue;
      }
      console.error("Saving discovered public email failed", { leadId, error });
      return {
        error: "Yhteystietoja löytyi, mutta tallennus epäonnistui. Päivitä sivu ja yritä uudelleen.",
        message: null,
      };
    }
  }

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "lead.public_email_lookup",
      entityType: "lead",
      entityId: lead.id,
      metadata: {
        website: research.finalUrl,
        publishedEmails: emails.length,
        saved: created,
        alreadyKnown,
        assignedToOtherLead,
      },
    },
  });

  if (created > 0 && lead.researchRecords.length) {
    try {
      await scoreLeadAction(lead.id);
    } catch (error) {
      console.error("Scoring after contact enrichment failed", { leadId, error });
    }
  }

  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/leads");
  revalidatePath("/leads/newly-found");
  revalidatePath("/outreach");

  return {
    error: null,
    message: created
      ? `Löytyi ${created} uutta julkista sähköpostiosoitetta. Tarkista vastaanottaja ennen lähettämistä. Osoitteiden toimitettavuutta ei ole vahvistettu.`
      : emails.length
        ? "Löytyneet julkiset osoitteet ovat jo tallessa tai kuuluvat toiselle liidille."
        : "Yrityksen verkkosivulta ei löytynyt käyttökelpoista julkista sähköpostiosoitetta. Yhteydenottolomake voi silti olla käytössä.",
  };
}
