"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { leadFormSchema } from "@/lib/lead-validation";
import {
  normalizeCompanyName,
  normalizeDomain,
  normalizeEmail,
} from "@/lib/normalize";
import { requireWorkspace } from "@/lib/workspace";
import { getGooglePlaceDetails } from "@/lib/lead-discovery/google-place-details";
import { reserveGooglePlacesDetails } from "@/lib/lead-discovery/place-details-usage";
import { researchPublicWebsite } from "@/lib/lead-research/website-research";

export type LeadActionState = {
  error: string | null;
};

const initialState: LeadActionState = {
  error: null,
};

function valuesFromFormData(formData: FormData) {
  return {
    companyName: String(formData.get("companyName") ?? ""),
    domain: String(formData.get("domain") ?? ""),
    website: String(formData.get("website") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    location: String(formData.get("location") ?? ""),
    companySize: String(formData.get("companySize") ?? ""),
    description: String(formData.get("description") ?? ""),
    whyRelevant: String(formData.get("whyRelevant") ?? ""),
    potentialService: String(formData.get("potentialService") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createLeadAction(
  _previousState: LeadActionState = initialState,
  formData: FormData
): Promise<LeadActionState> {
  const { user, workspace } = await requireWorkspace();
  const parsed = leadFormSchema.safeParse(valuesFromFormData(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the lead details.",
    };
  }

  const values = parsed.data;
  const normalizedName = normalizeCompanyName(values.companyName);
  const normalizedDomain = normalizeDomain(values.domain || values.website);
  const normalizedContactEmail = values.email
    ? normalizeEmail(values.email)
    : null;

  const duplicateLead = await prisma.lead.findFirst({
    where: {
      workspaceId: workspace.id,
      OR: [
        { companyNameNormalized: normalizedName },
        ...(normalizedDomain
          ? [{ domainNormalized: normalizedDomain }]
          : []),
      ],
    },
    select: { id: true, companyName: true },
  });

  if (duplicateLead) {
    return {
      error: `A possible duplicate already exists: ${duplicateLead.companyName}.`,
    };
  }

  if (normalizedContactEmail) {
    const duplicateContact = await prisma.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        emailNormalized: normalizedContactEmail,
      },
      select: { id: true },
    });

    if (duplicateContact) {
      return {
        error: "That contact email already exists in this workspace.",
      };
    }
  }

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        workspaceId: workspace.id,
        companyName: values.companyName.trim(),
        companyNameNormalized: normalizedName,
        domain: optional(values.domain),
        domainNormalized: normalizedDomain,
        domainKey: normalizedDomain
          ? `${workspace.id}:${normalizedDomain}`
          : null,
        website: optional(values.website),
        industry: optional(values.industry),
        location: optional(values.location),
        companySize: optional(values.companySize),
        description: optional(values.description),
        whyRelevant: optional(values.whyRelevant),
        potentialService: optional(values.potentialService),
        source: "MANUAL",
        ...(values.contactName ||
        values.jobTitle ||
        values.email
          ? {
              contacts: {
                create: {
                  workspaceId: workspace.id,
                  name: optional(values.contactName),
                  jobTitle: optional(values.jobTitle),
                  email: optional(values.email),
                  emailNormalized: normalizedContactEmail,
                  emailKey: normalizedContactEmail
                    ? `${workspace.id}:${normalizedContactEmail}`
                    : null,
                  isPrimary: true,
                },
              },
            }
          : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.created",
        entityType: "lead",
        entityId: created.id,
        metadata: {
          source: "manual",
        },
      },
    });

    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(
  leadId: string,
  _previousState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const { user, workspace } = await requireWorkspace();
  const parsed = leadFormSchema.safeParse(valuesFromFormData(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the lead details.",
    };
  }

  const existing = await prisma.lead.findFirst({
    where: {
      id: leadId,
      workspaceId: workspace.id,
    },
    include: {
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  if (!existing) {
    return { error: "Lead not found." };
  }

  const values = parsed.data;
  const normalizedName = normalizeCompanyName(values.companyName);
  const normalizedDomain = normalizeDomain(values.domain || values.website);
  const normalizedContactEmail = values.email
    ? normalizeEmail(values.email)
    : null;

  const duplicateLead = await prisma.lead.findFirst({
    where: {
      workspaceId: workspace.id,
      id: { not: leadId },
      OR: [
        { companyNameNormalized: normalizedName },
        ...(normalizedDomain
          ? [{ domainNormalized: normalizedDomain }]
          : []),
      ],
    },
    select: { companyName: true },
  });

  if (duplicateLead) {
    return {
      error: `A possible duplicate already exists: ${duplicateLead.companyName}.`,
    };
  }

  if (normalizedContactEmail) {
    const duplicateContact = await prisma.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        emailNormalized: normalizedContactEmail,
        leadId: { not: leadId },
      },
      select: { id: true },
    });

    if (duplicateContact) {
      return {
        error: "That contact email belongs to another lead in this workspace.",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        companyName: values.companyName.trim(),
        companyNameNormalized: normalizedName,
        domain: optional(values.domain),
        domainNormalized: normalizedDomain,
        domainKey: normalizedDomain
          ? `${workspace.id}:${normalizedDomain}`
          : null,
        website: optional(values.website),
        industry: optional(values.industry),
        location: optional(values.location),
        companySize: optional(values.companySize),
        description: optional(values.description),
        whyRelevant: optional(values.whyRelevant),
        potentialService: optional(values.potentialService),
      },
    });

    const primaryContact = existing.contacts[0];
    const hasContactData =
      Boolean(values.contactName) ||
      Boolean(values.jobTitle) ||
      Boolean(values.email);

    if (primaryContact && hasContactData) {
      await tx.contact.update({
        where: { id: primaryContact.id },
        data: {
          name: optional(values.contactName),
          jobTitle: optional(values.jobTitle),
          email: optional(values.email),
          emailNormalized: normalizedContactEmail,
          emailKey: normalizedContactEmail
            ? `${workspace.id}:${normalizedContactEmail}`
            : null,
        },
      });
    } else if (primaryContact && !hasContactData) {
      await tx.contact.delete({
        where: { id: primaryContact.id },
      });
    } else if (!primaryContact && hasContactData) {
      await tx.contact.create({
        data: {
          workspaceId: workspace.id,
          leadId,
          name: optional(values.contactName),
          jobTitle: optional(values.jobTitle),
          email: optional(values.email),
          emailNormalized: normalizedContactEmail,
          emailKey: normalizedContactEmail
            ? `${workspace.id}:${normalizedContactEmail}`
            : null,
          isPrimary: true,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.updated",
        entityType: "lead",
        entityId: leadId,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

export async function deleteLeadAction(leadId: string) {
  const { user, workspace } = await requireWorkspace();

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      workspaceId: workspace.id,
    },
    select: {
      id: true,
      companyName: true,
    },
  });

  if (!lead) {
    redirect("/leads");
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.deleted",
        entityType: "lead",
        entityId: lead.id,
        metadata: {
          companyName: lead.companyName,
        },
      },
    });

    await tx.lead.delete({
      where: {
        id: lead.id,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect("/leads");
}

export async function researchLeadAction(leadId: string) {
  const { user, workspace } = await requireWorkspace();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId: workspace.id },
    select: {
      id: true,
      companyName: true,
      providerName: true,
      providerExternalId: true,
    },
  });

  if (!lead) throw new Error("Lead not found.");
  if (lead.providerName !== "google-places" || !lead.providerExternalId) {
    throw new Error("This lead does not have a Google Places identity for enrichment.");
  }

  const existingResearch = await prisma.researchRecord.findFirst({
    where: {
      workspaceId: workspace.id,
      leadId: lead.id,
      status: "COMPLETE",
    },
    select: { id: true },
  });

  if (existingResearch) {
    revalidatePath(`/leads/${lead.id}`);
    return;
  }

  await reserveGooglePlacesDetails(workspace.id);
  const details = await getGooglePlaceDetails(lead.providerExternalId);

  const normalizedDomain = details.domain;
  if (normalizedDomain) {
    const duplicate = await prisma.lead.findFirst({
      where: {
        workspaceId: workspace.id,
        id: { not: lead.id },
        domainNormalized: normalizedDomain,
      },
      select: { companyName: true },
    });
    if (duplicate) {
      throw new Error(`Website already belongs to another lead: ${duplicate.companyName}.`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        website: details.website ?? undefined,
        domain: normalizedDomain ?? undefined,
        domainNormalized: normalizedDomain ?? undefined,
        domainKey: normalizedDomain ? `${workspace.id}:${normalizedDomain}` : undefined,
        location: details.location ?? undefined,
        industry: details.industry ?? undefined,
      },
    });

    const research = await tx.researchRecord.create({
      data: {
        workspaceId: workspace.id,
        leadId: lead.id,
        status: "COMPLETE",
        companySummary: details.website
          ? `Google Places confirms a website for ${details.companyName ?? lead.companyName}.`
          : `Google Places did not return a website for ${details.companyName ?? lead.companyName}.`,
        onlinePresence: details.website ?? null,
        opportunities: details.website ? null : "No website was returned by Google Places.",
        relevantServices: [],
        doNotClaim: ["Google Places data alone does not verify company size, revenue, or website quality."],
        confidence: 85,
      },
    });

    const evidence = [
      details.website ? { type: "website", description: `Website: ${details.website}`, sourceUrl: details.website } : null,
      details.phone ? { type: "phone", description: `Public business phone: ${details.phone}` } : null,
      details.location ? { type: "address", description: `Business address: ${details.location}` } : null,
    ].filter((item): item is { type: string; description: string; sourceUrl?: string } => Boolean(item));

    for (const item of evidence) {
      await tx.researchEvidence.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          researchRecordId: research.id,
          type: item.type,
          description: item.description,
          sourceUrl: item.sourceUrl ?? null,
          confidence: 90,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.enriched",
        entityType: "lead",
        entityId: lead.id,
        metadata: {
          provider: "google-places",
          placeId: lead.providerExternalId,
          websiteFound: Boolean(details.website),
          phoneFound: Boolean(details.phone),
          businessStatus: details.businessStatus ?? null,
        },
      },
    });
  });

  revalidatePath(`/leads/${lead.id}`);
}


export async function researchWebsiteAction(leadId: string) {
  const { user, workspace } = await requireWorkspace();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId: workspace.id },
    select: { id: true, website: true },
  });
  if (!lead) throw new Error("Lead not found.");
  if (!lead.website) throw new Error("This lead does not have a website.");

  const existingAudit = await prisma.websiteAudit.findFirst({
    where: { workspaceId: workspace.id, leadId: lead.id, status: "COMPLETE" },
    select: { id: true },
  });
  if (existingAudit) {
    revalidatePath(`/leads/${lead.id}`);
    return;
  }

  const result = await researchPublicWebsite(lead.website);

  await prisma.$transaction(async (tx) => {
    const audit = await tx.websiteAudit.create({
      data: {
        workspaceId: workspace.id,
        leadId: lead.id,
        status: "COMPLETE",
        url: result.finalUrl,
        httpsEnabled: result.httpsEnabled,
        pageTitle: result.pageTitle,
        metaDescription: result.metaDescription,
        h1: result.h1,
        ctaNotes: result.hasContactLink ? "A contact link was detected on the homepage." : "No clear contact link was detected on the homepage.",
        seoNotes: [
          result.pageTitle ? null : "Homepage title was not detected.",
          result.metaDescription ? null : "Meta description was not detected.",
          result.h1 ? null : "H1 heading was not detected.",
        ].filter(Boolean).join(" ") || "Basic homepage SEO elements were detected.",
      },
    });

    const evidence = [
      result.pageTitle ? { type: "page_title", description: `Homepage title: ${result.pageTitle}` } : null,
      result.h1 ? { type: "h1", description: `Homepage H1: ${result.h1}` } : null,
      ...result.emails.map((email) => ({ type: "public_email", description: `Public email found on homepage: ${email}` })),
      { type: "contact_path", description: result.hasContactLink ? "Homepage contains a contact link." : "No clear contact link was detected on the homepage." },
    ].filter((item): item is { type: string; description: string } => Boolean(item));

    for (const item of evidence) {
      await tx.researchEvidence.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          websiteAuditId: audit.id,
          type: item.type,
          description: item.description,
          sourceUrl: result.finalUrl,
          confidence: 90,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.website_researched",
        entityType: "lead",
        entityId: lead.id,
        metadata: { url: result.finalUrl, publicEmailsFound: result.emails.length },
      },
    });
  });

  revalidatePath(`/leads/${lead.id}`);
}


export async function scoreLeadAction(leadId: string) {
  const { user, workspace } = await requireWorkspace();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId: workspace.id },
    include: {
      websiteAudits: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
      researchRecords: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!lead) throw new Error("Lead not found.");

  const audit = lead.websiteAudits[0];
  const research = lead.researchRecords[0];
  if (!research) throw new Error("Research the company before scoring it.");

  const breakdown = {
    researchEvidence: { score: 20, max: 20, reason: "Google Places research completed." },
    websiteKnown: { score: lead.website ? 15 : 0, max: 15, reason: lead.website ? "A public website is known." : "No public website is known." },
    websiteAudit: { score: audit ? 20 : 0, max: 20, reason: audit ? "Homepage analysis completed." : "Homepage has not been analyzed." },
    seoBasics: {
      score: audit ? [audit.pageTitle, audit.metaDescription, audit.h1].filter(Boolean).length * 5 : 0,
      max: 15,
      reason: audit ? "Based on detected title, meta description and H1." : "No website audit available.",
    },
    contactOpportunity: {
      score: audit?.ctaNotes?.startsWith("No clear") ? 15 : 5,
      max: 15,
      reason: audit?.ctaNotes?.startsWith("No clear") ? "No clear contact link was detected on the homepage." : "A contact path was detected or has not been evaluated.",
    },
    profileCompleteness: {
      score: [lead.industry, lead.location, lead.domain].filter(Boolean).length * 5,
      max: 15,
      reason: "Based on known industry, location and domain.",
    },
  };

  const total = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
  const confidence = audit ? 85 : 65;
  const summary = total >= 75
    ? "Vahva tutkittu liidi nykyisten havaintojen perusteella."
    : total >= 50
      ? "Kohtalainen liidi; lisätutkimus voi parantaa arviota."
      : "Tietoa on vielä vähän luotettavaan arvioon.";

  await prisma.$transaction(async (tx) => {
    await tx.leadScore.create({
      data: { workspaceId: workspace.id, leadId: lead.id, total, confidence, breakdown, summary },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.scored",
        entityType: "lead",
        entityId: lead.id,
        metadata: { total, confidence },
      },
    });
  });

  revalidatePath(`/leads/${lead.id}`);
}
