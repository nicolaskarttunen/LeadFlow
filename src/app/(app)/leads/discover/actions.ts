"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getLeadDiscoveryProvider } from "@/lib/lead-discovery";
import type { LeadDiscoveryProviderName } from "@/lib/lead-discovery";
import type { DiscoveredLead } from "@/lib/lead-discovery";
import { rerankCandidatesWithAI } from "@/lib/lead-discovery/ai-candidate-ranker";
import { enrichCandidateWithGoogle } from "@/lib/lead-discovery/google-enrichment";
import { rankCandidates } from "@/lib/lead-discovery/rank-candidates";
import { normalizeCompanyName, normalizeDomain } from "@/lib/normalize";
import { requireWorkspace } from "@/lib/workspace";
import { reserveGooglePlacesTextSearch } from "@/lib/lead-discovery/usage";
import { analyzeLeadAction } from "@/app/(app)/leads/actions";

export type DiscoveryActionState = { results: DiscoveredLead[]; error: string | null };
export type AddDiscoveryState = { message: string | null; error: string | null };

export async function discoverLeadsAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const { workspace } = await requireWorkspace();
  const requestedProvider = String(formData.get("provider") ?? "prh-ytj");
  const providerName: LeadDiscoveryProviderName = requestedProvider === "google-places" ? "google-places" : "prh-ytj";
  const industry = String(formData.get("industry") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const companySize = String(formData.get("companySize") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!industry && !location && keywords.length === 0) {
    return { results: [], error: "Add an industry, location or keyword to start discovery." };
  }

  const provider = getLeadDiscoveryProvider(providerName);
  if (provider.name === "google-places") {
    await reserveGooglePlacesTextSearch(workspace.id);
  }

  const [salesProfile, companyProfile, existingLeads] = await Promise.all([
    prisma.idealCustomerProfile.findFirst({
      where: { workspaceId: workspace.id, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        targetCustomer: true,
        industries: true,
        keywords: true,
        excludedIndustries: true,
        excludedCompanies: true,
      },
    }),
    prisma.companyProfile.findUnique({
      where: { workspaceId: workspace.id },
      select: { offering: true },
    }),
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      select: {
        companyNameNormalized: true,
        domainNormalized: true,
        providerName: true,
        providerExternalId: true,
      },
    }),
  ]);

  const candidateLimit = provider.name === "prh-ytj" ? 300 : 10;
  const candidates = await provider.discover({
    industry: industry || undefined,
    location: location || undefined,
    companySize: companySize || undefined,
    keywords,
    limit: candidateLimit,
  });

  const existingNames = new Set(existingLeads.map((lead) => lead.companyNameNormalized).filter(Boolean));
  const existingDomains = new Set(existingLeads.map((lead) => lead.domainNormalized).filter(Boolean));
  const existingProviderIds = new Set(
    existingLeads
      .filter((lead) => lead.providerName && lead.providerExternalId)
      .map((lead) => `${lead.providerName}:${lead.providerExternalId}`),
  );

  const newCandidates = candidates.filter((candidate) => {
    const normalizedName = normalizeCompanyName(candidate.companyName);
    const normalizedDomain = normalizeDomain(candidate.domain || candidate.website);
    const providerKey = candidate.provider && candidate.providerPlaceId
      ? `${candidate.provider}:${candidate.providerPlaceId}`
      : null;

    if (existingNames.has(normalizedName)) return false;
    if (normalizedDomain && existingDomains.has(normalizedDomain)) return false;
    if (providerKey && existingProviderIds.has(providerKey)) return false;
    return true;
  });

  const profileForRanking = {
    offering: companyProfile?.offering,
    targetCustomer: salesProfile?.targetCustomer,
    industries: salesProfile?.industries ?? (industry ? [industry] : []),
    keywords: keywords.length ? keywords : salesProfile?.keywords ?? [],
    excludedIndustries: salesProfile?.excludedIndustries ?? [],
    excludedCompanies: salesProfile?.excludedCompanies ?? [],
  };

  const initiallyRanked = rankCandidates(newCandidates, profileForRanking);
  let ranked = initiallyRanked;

  if (provider.name === "prh-ytj" && initiallyRanked.length) {
    const aiEvaluated = await rerankCandidatesWithAI(initiallyRanked, profileForRanking);
    const profileRanked = rankCandidates(aiEvaluated, profileForRanking);
    const enrichmentPool = profileRanked.slice(0, 12);
    const enriched: DiscoveredLead[] = [];

    for (const candidate of enrichmentPool) {
      try {
        enriched.push(await enrichCandidateWithGoogle(candidate, workspace.id));
      } catch (error) {
        console.error("Candidate Google enrichment failed", {
          companyName: candidate.companyName,
          error,
        });
        enriched.push(candidate);
      }
    }

    ranked = rankCandidates(enriched, profileForRanking);
  }

  const results = ranked.slice(0, 10);
  if (!results.length) {
    return {
      results: [],
      error: "No suitable new companies were found from this candidate pool. Try broadening the profile or search again later.",
    };
  }

  return { results, error: null };
}

export async function addDiscoveredLeadsAction(
  _previousState: AddDiscoveryState,
  formData: FormData,
): Promise<AddDiscoveryState> {
  const { user, workspace } = await requireWorkspace();
  const selected = formData.getAll("selectedLead").map(String);
  if (!selected.length) return { message: null, error: "Select at least one company to add." };

  let created = 0;
  let skipped = 0;

  for (const raw of selected) {
    let item: DiscoveredLead;
    try {
      item = JSON.parse(raw) as DiscoveredLead;
    } catch {
      skipped += 1;
      continue;
    }

    if (!item.companyName?.trim()) {
      skipped += 1;
      continue;
    }

    const normalizedName = normalizeCompanyName(item.companyName);
    const normalizedDomain = normalizeDomain(item.domain || item.website);
    const duplicate = await prisma.lead.findFirst({
      where: {
        workspaceId: workspace.id,
        OR: [
          { companyNameNormalized: normalizedName },
          ...(normalizedDomain ? [{ domainNormalized: normalizedDomain }] : []),
          ...(item.provider && item.providerPlaceId
            ? [{ providerName: item.provider, providerExternalId: item.providerPlaceId }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      skipped += 1;
      continue;
    }

    const lead = await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        companyName: item.companyName.trim(),
        companyNameNormalized: normalizedName,
        domain: item.domain ?? null,
        domainNormalized: normalizedDomain,
        domainKey: normalizedDomain ? `${workspace.id}:${normalizedDomain}` : null,
        website: item.website ?? null,
        industry: item.industry ?? null,
        location: item.location ?? null,
        companySize: item.companySize ?? null,
        description: item.description ?? null,
        whyRelevant: item.whyRelevant ?? null,
        potentialService: item.potentialService ?? null,
        providerName: item.provider ?? null,
        providerExternalId: item.providerPlaceId ?? null,
        source: item.provider === "google-places" || item.provider === "prh-ytj" ? "PROVIDER" : "MOCK",
        reviewStatus: item.provider === "google-places" || item.provider === "prh-ytj" ? "PENDING" : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "lead.discovered",
        entityType: "lead",
        entityId: lead.id,
        metadata: {
          provider: item.provider ?? "mock",
          providerPlaceId: item.providerPlaceId ?? null,
          googlePlaceId: item.googlePlaceId ?? null,
          websiteStatus: item.websiteStatus ?? "UNKNOWN",
          discoveryScore: item.discoveryScore ?? null,
          discoveryReasons: item.discoveryReasons ?? [],
          profileFitScore: item.profileFitScore ?? null,
          profileFitReason: item.profileFitReason ?? null,
          reviewed: true,
        },
      },
    });

    created += 1;
    if (item.provider === "google-places" || item.provider === "prh-ytj") {
      try {
        await analyzeLeadAction(lead.id);
      } catch (error) {
        console.error("Automatic lead analysis failed", { leadId: lead.id, error });
        await prisma.auditLog.create({
          data: {
            workspaceId: workspace.id,
            actorUserId: user.id,
            action: "lead.analysis_failed",
            entityType: "lead",
            entityId: lead.id,
            metadata: { error: error instanceof Error ? error.message : "Unknown automatic analysis error" },
          },
        });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/leads/newly-found");

  return {
    error: null,
    message: `${created} selected lead${created === 1 ? "" : "s"} added${skipped ? `; ${skipped} skipped` : ""}.`,
  };
}
