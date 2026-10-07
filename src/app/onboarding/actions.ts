"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ensureWorkspaceSubscription } from "@/lib/billing/subscription";
import { requireUser } from "@/lib/session";
import {
  slugify,
  splitCommaSeparated,
} from "@/lib/normalize";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser();

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });

  if (existingMembership) {
    redirect("/dashboard");
  }

  const companyName = field(formData, "companyName");
  const website = field(formData, "website");
  const description = field(formData, "description");
  const offering = field(formData, "offering");
  const idealCustomer = field(formData, "idealCustomer");
  const industries = splitCommaSeparated(field(formData, "industries"));
  const regions = splitCommaSeparated(field(formData, "regions"));
  const companySize = field(formData, "companySize");
  const keywords = splitCommaSeparated(field(formData, "keywords"));
  const excludedIndustries = splitCommaSeparated(
    field(formData, "excludedIndustries")
  );
  const excludedCompanies = splitCommaSeparated(
    field(formData, "excludedCompanies")
  );
  const emailTone = field(formData, "emailTone") || "Professional";

  if (companyName.length < 2) {
    redirect("/onboarding?error=company-name");
  }

  const baseSlug = slugify(companyName) || "workspace";
  const slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        name: companyName,
        slug,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
        companyProfile: {
          create: {
            companyName,
            website: website || null,
            description: description || null,
            offering: offering || null,
            idealCustomer: idealCustomer || null,
            industries,
            regions,
            companySize: companySize || null,
            keywords,
            exclusions: [...excludedIndustries, ...excludedCompanies],
            emailTone,
          },
        },
        idealCustomerProfiles: {
          create: {
            name: "Primary ICP",
            targetCustomer: idealCustomer || null,
            industries,
            regions,
            companySize: companySize || null,
            keywords,
            excludedIndustries,
            excludedCompanies,
            active: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: created.id,
        actorUserId: user.id,
        action: "workspace.created",
        entityType: "workspace",
        entityId: created.id,
        metadata: {
          source: "onboarding",
        },
      },
    });

    return created;
  });

  // Create the subscription shell without starting the trial clock.
  // The user explicitly chooses Trial, Starter, Growth or Pro next.
  await ensureWorkspaceSubscription(workspace.id);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect("/choose-plan");
}
