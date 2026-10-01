"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getLeadDiscoveryProvider } from "@/lib/lead-discovery";
import { normalizeCompanyName, normalizeDomain } from "@/lib/normalize";
import { requireWorkspace } from "@/lib/workspace";

export type DiscoveryActionState = { message: string | null; error: string | null };
const initialDiscoveryState: DiscoveryActionState = { message: null, error: null };

export async function discoverLeadsAction(_previousState: DiscoveryActionState, formData: FormData): Promise<DiscoveryActionState> {
  const { user, workspace } = await requireWorkspace();
  const industry = String(formData.get("industry") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const companySize = String(formData.get("companySize") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!industry && !location && keywords.length === 0) return { message: null, error: "Add an industry, location or keyword to start discovery." };

  const provider = getLeadDiscoveryProvider();
  const discovered = await provider.discover({ industry: industry || undefined, location: location || undefined, companySize: companySize || undefined, keywords, limit: 10 });
  let created = 0, skipped = 0;

  for (const item of discovered) {
    const normalizedName = normalizeCompanyName(item.companyName);
    const normalizedDomain = normalizeDomain(item.domain || item.website);
    const duplicate = await prisma.lead.findFirst({ where: { workspaceId: workspace.id, OR: [{ companyNameNormalized: normalizedName }, ...(normalizedDomain ? [{ domainNormalized: normalizedDomain }] : [])] }, select: { id: true } });
    if (duplicate) { skipped += 1; continue; }
    const lead = await prisma.lead.create({ data: { workspaceId: workspace.id, companyName: item.companyName, companyNameNormalized: normalizedName, domain: item.domain ?? null, domainNormalized: normalizedDomain, domainKey: normalizedDomain ? `${workspace.id}:${normalizedDomain}` : null, website: item.website ?? null, industry: item.industry ?? null, location: item.location ?? null, companySize: item.companySize ?? null, description: item.description ?? null, whyRelevant: item.whyRelevant ?? null, potentialService: item.potentialService ?? null, source: "MOCK" } });
    await prisma.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: "lead.discovered", entityType: "lead", entityId: lead.id, metadata: { provider: provider.name } } });
    created += 1;
  }
  revalidatePath("/dashboard"); revalidatePath("/leads");
  return { error: null, message: `Discovery complete: ${created} lead${created === 1 ? "" : "s"} added${skipped ? `, ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}.` };
}
