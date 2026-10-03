"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

function list(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

export async function saveProspectingSettingsAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
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

  const existing = await prisma.idealCustomerProfile.findFirst({ where: { workspaceId: workspace.id, active: true }, orderBy: { createdAt: "asc" } });
  if (existing) await prisma.idealCustomerProfile.update({ where: { id: existing.id }, data });
  else await prisma.idealCustomerProfile.create({ data: { workspaceId: workspace.id, ...data } });

  revalidatePath("/settings/prospecting");
}
