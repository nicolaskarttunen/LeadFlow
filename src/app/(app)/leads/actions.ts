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
  const [lead, profile] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, workspaceId: workspace.id },
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
        websiteAudits: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
        researchRecords: { where: { status: "COMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.idealCustomerProfile.findFirst({
      where: { workspaceId: workspace.id, active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!lead) throw new Error("Lead not found.");
  if (!profile) throw new Error("Create an active prospecting profile before scoring leads.");
  const research = lead.researchRecords[0];
  if (!research) throw new Error("Research the company before scoring it.");
  const audit = lead.websiteAudits[0];

  const norm = (value?: string | null) => (value ?? "").toLocaleLowerCase("fi-FI").trim();
  const containsAny = (value: string | null | undefined, wanted: string[]) => {
    const haystack = norm(value);
    return wanted.some((item) => haystack.includes(norm(item)) || norm(item).includes(haystack));
  };
  const excludedIndustry = containsAny(lead.industry, profile.excludedIndustries);
  const excludedCompany = profile.excludedCompanies.some((item) => norm(lead.companyName).includes(norm(item)));
  const industryMatch = profile.industries.length === 0 ? null : containsAny(lead.industry, profile.industries);
  const regionMatch = profile.regions.length === 0 ? null : containsAny(lead.location, profile.regions);
  const sizeMatch = !profile.companySize ? null : (lead.companySize ? norm(lead.companySize) === norm(profile.companySize) : null);

  const fitParts = [
    { configured: profile.industries.length > 0, match: industryMatch, weight: 20 },
    { configured: profile.regions.length > 0, match: regionMatch, weight: 15 },
    { configured: Boolean(profile.companySize), match: sizeMatch, weight: 5 },
  ];
  let fitScore = 0;
  let fitMaxConfigured = 0;
  for (const part of fitParts) {
    if (!part.configured) continue;
    fitMaxConfigured += part.weight;
    if (part.match === true) fitScore += part.weight;
  }
  if (fitMaxConfigured === 0) fitScore = 20;
  else if (fitMaxConfigured < 40) fitScore = Math.round((fitScore / fitMaxConfigured) * 40);

  const keywordText = [lead.potentialService, lead.description, research.opportunities, audit?.seoNotes, audit?.ctaNotes].filter(Boolean).join(" ");
  const matchedKeywords = profile.keywords.filter((keyword) => containsAny(keywordText, [keyword]));
  const opportunityScore = profile.keywords.length
    ? Math.min(30, Math.round((matchedKeywords.length / profile.keywords.length) * 30))
    : audit ? 15 : 5;

  const contactScore = lead.contacts[0]?.email ? 15 : audit ? 7 : lead.website ? 4 : 0;
  const evidenceScore = Math.min(15, (research ? 8 : 0) + (audit ? 5 : 0) + (lead.providerExternalId ? 2 : 0));

  const breakdown = {
    icpFit: {
      score: excludedIndustry || excludedCompany ? 0 : fitScore,
      max: 40,
      reason: excludedIndustry || excludedCompany
        ? "Yritys osuu prospektointiprofiilin poissulkuun."
        : `Sopivuus asetuksiin: toimiala ${industryMatch === null ? "ei arvioitavissa" : industryMatch ? "osuu" : "ei osu"}, alue ${regionMatch === null ? "ei arvioitavissa" : regionMatch ? "osuu" : "ei osu"}, koko ${sizeMatch === null ? "ei arvioitavissa" : sizeMatch ? "osuu" : "ei osu"}.`,
    },
    opportunity: {
      score: opportunityScore,
      max: 30,
      reason: profile.keywords.length
        ? `Havaittuja tarpeita/signaaleja: ${matchedKeywords.length ? matchedKeywords.join(", ") : "ei vielä vahvistettu"}.`
        : "Tarvesignaaleja ei ole määritetty profiilissa; pisteet perustuvat saatavilla olevaan verkkosivuanalyysiin.",
    },
    contactability: {
      score: contactScore,
      max: 15,
      reason: lead.contacts[0]?.email ? "Ensisijainen sähköposti on tiedossa." : lead.website ? "Verkkosivu on tiedossa, mutta ensisijaista sähköpostia ei ole vahvistettu." : "Vahvistettua yhteydenottokanavaa ei ole.",
    },
    evidence: {
      score: evidenceScore,
      max: 15,
      reason: `Tutkimus ${research ? "valmis" : "puuttuu"}, verkkosivuanalyysi ${audit ? "valmis" : "puuttuu"}.`,
    },
  };

  let total = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
  if (excludedIndustry || excludedCompany) total = 0;
  const confidenceSignals = [Boolean(lead.industry), Boolean(lead.location), Boolean(lead.companySize), Boolean(research), Boolean(audit)];
  const confidence = Math.round((confidenceSignals.filter(Boolean).length / confidenceSignals.length) * 100);
  const summary = excludedIndustry || excludedCompany
    ? "Liidi on prospektointiprofiilin poissulkujen ulkopuolella."
    : total >= profile.minimumScore
      ? "Liidi ylittää nykyisen prospektointiprofiilin minimipisterajan."
      : "Liidi jää nykyisen prospektointiprofiilin minimipisterajan alle.";

  await prisma.$transaction(async (tx) => {
    await tx.leadScore.create({ data: { workspaceId: workspace.id, leadId: lead.id, total, confidence, breakdown, summary } });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id, actorUserId: user.id, action: "lead.scored", entityType: "lead", entityId: lead.id,
        metadata: { total, confidence, profileId: profile.id, minimumScore: profile.minimumScore },
      },
    });
  });
  revalidatePath("/dashboard");
  revalidatePath("/leads/newly-found");
  revalidatePath(`/leads/${lead.id}`);
}

