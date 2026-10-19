"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { scoreLeadAction } from "@/app/(app)/leads/actions";

function list(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

export async function saveProspectingSettingsAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const offering = String(formData.get("offering") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Pääprofiili";
  const leadsPerWeek = Math.min(100, Math.max(1, Number(formData.get("leadsPerWeek") ?? 25)));
  const minimumScore = Math.min(100, Math.max(0, Number(formData.get("minimumScore") ?? 60)));
  const regionMode = String(formData.get("regionMode") ?? "custom");
  const regions = regionMode === "finland" ? ["Suomi"] : list(formData.get("regions"));
  const data = {
    name,
    targetCustomer: String(formData.get("targetCustomer") ?? "").trim() || null,
    industries: list(formData.get("industries")),
    regions,
    companySize: String(formData.get("companySize") ?? "").trim() || null,
    keywords: list(formData.get("keywords")),
    excludedIndustries: list(formData.get("excludedIndustries")),
    excludedCompanies: list(formData.get("excludedCompanies")),
    automationEnabled: formData.get("automationEnabled") === "on",
    leadsPerWeek,
    minimumScore,
    language: formData.get("language") === "en" ? "en" : "fi",
    active: true,
  };

  await prisma.companyProfile.updateMany({ where: { workspaceId: workspace.id }, data: { offering: offering || null } });

  const existing = await prisma.idealCustomerProfile.findFirst({
    where: { workspaceId: workspace.id, active: true },
    orderBy: { createdAt: "asc" },
  });
  const scoreFields = [
    "industries", "regions", "companySize", "keywords",
    "excludedIndustries", "excludedCompanies", "minimumScore",
  ] as const;
  const scoringChanged = !existing || scoreFields.some((field) =>
    JSON.stringify(existing[field]) !== JSON.stringify(data[field]),
  );
  if (existing) await prisma.idealCustomerProfile.update({ where: { id: existing.id }, data });
  else await prisma.idealCustomerProfile.create({ data: { workspaceId: workspace.id, ...data } });

  // Re-score existing researched prospects after relevant profile changes.
  // Use bounded batches for the MVP so saving preferences cannot launch an
  // unbounded number of database writes. A background queue will be needed
  // before supporting large workspaces.
  if (scoringChanged) {
    const leads = await prisma.lead.findMany({
      where: {
        workspaceId: workspace.id,
        reviewStatus: { in: ["PENDING", "KEPT"] },
        researchRecords: { some: { status: "COMPLETE" } },
      },
      orderBy: { discoveredAt: "desc" },
      select: { id: true },
      take: 101,
    });
    if (leads.length > 100) {
      console.warn("Automatic rescoring capped at 100 leads; remaining leads require a background job.", {
        workspaceId: workspace.id,
      });
    }
    const selected = leads.slice(0, 100);
    for (let offset = 0; offset < selected.length; offset += 5) {
      const settled = await Promise.allSettled(
        selected.slice(offset, offset + 5).map((lead) => scoreLeadAction(lead.id)),
      );
      for (const result of settled) {
        if (result.status === "rejected") {
          console.error("Automatic lead rescoring failed", result.reason);
        }
      }
    }
  }

  revalidatePath("/settings/prospecting");
  revalidatePath("/leads/discover");
  revalidatePath("/leads/newly-found");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/settings/prospecting?saved=1");
}
