import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const ACTIVE_WORKSPACE_COOKIE = "leadflow_workspace";

export async function getCurrentWorkspace() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const preferredWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (preferredWorkspaceId) {
    const preferredMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: preferredWorkspaceId,
      },
      include: {
        workspace: true,
      },
    });

    if (preferredMembership) {
      return {
        user,
        membership: preferredMembership,
        workspace: preferredMembership.workspace,
      };
    }
  }

  const fallbackMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!fallbackMembership) {
    return null;
  }

  return {
    user,
    membership: fallbackMembership,
    workspace: fallbackMembership.workspace,
  };
}

export async function requireWorkspace() {
  const current = await getCurrentWorkspace();

  if (!current) {
    redirect("/onboarding");
  }

  return current;
}
