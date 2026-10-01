"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getLeadDiscoveryProvider } from "@/lib/lead-discovery";
import type { DiscoveredLead } from "@/lib/lead-discovery";
import { normalizeCompanyName, normalizeDomain } from "@/lib/normalize";
import { requireWorkspace } from "@/lib/workspace";

export type DiscoveryActionState = { results: DiscoveredLead[]; error: string | null };
export type AddDiscoveryState = { message: string | null; error: string | null };

export async function discoverLeadsAction(_previousState: DiscoveryActionState, formData: FormData): Promise<DiscoveryActionState> {
  await requireWorkspace();
  const industry = String(formData.get("industry") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const companySize = String(formData.get("companySize") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!industry && !location && keywords.length === 0) return { results: [], error: "Add an industry, location or keyword to start discovery." };
  const provider = getLeadDiscoveryProvider();
  const results = await provider.discover({ industry: industry || undefined, location: location || undefined, companySize: companySize || undefined, keywords, limit: 10 });
  return { results, error: null };
}

export async function addDiscoveredLeadsAction(_previousState: AddDiscoveryState, formData: FormData): Promise<AddDiscoveryState> {
  const { user, workspace } = await requireWorkspace();
  const selected = formData.getAll("selectedLead").map(String);
  if (!selected.length) return { message: null, error: "Select at least one company to add." };
  let created = 0, skipped = 0;
  for (const raw of selected) {
    let item: DiscoveredLead;
    try { item = JSON.parse(raw) as DiscoveredLead; } catch { skipped += 1; continue; }
    if (!item.companyName?.trim()) { skipped += 1; continue; }
    const normalizedName = normalizeCompanyName(item.companyName);
    const normalizedDomain = normalizeDomain(item.domain || item.website);
    const duplicate = await prisma.lead.findFirst({ where: { workspaceId: workspace.id, OR: [{ companyNameNormalized: normalizedName }, ...(normalizedDomain ? [{ domainNormalized: normalizedDomain }] : [])] }, select: { id: true } });
    if (duplicate) { skipped += 1; continue; }
    const lead = await prisma.lead.create({ data: { workspaceId: workspace.id, companyName: item.companyName.trim(), companyNameNormalized: normalizedName, domain: item.domain ?? null, domainNormalized: normalizedDomain, domainKey: normalizedDomain ? `${workspace.id}:${normalizedDomain}` : null, website: item.website ?? null, industry: item.industry ?? null, location: item.location ?? null, companySize: item.companySize ?? null, description: item.description ?? null, whyRelevant: item.whyRelevant ?? null, potentialService: item.potentialService ?? null, source: "MOCK" } });
    await prisma.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: "lead.discovered", entityType: "lead", entityId: lead.id, metadata: { provider: "mock", reviewed: true } } });
    created += 1;
  }
  revalidatePath("/dashboard"); revalidatePath("/leads");
  return { error: null, message: `${created} selected lead${created === 1 ? "" : "s"} added${skipped ? `; ${skipped} skipped` : ""}.` };
}
