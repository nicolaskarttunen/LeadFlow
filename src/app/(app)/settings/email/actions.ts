"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export async function disconnectEmailProviderAction(providerName: string) {
  const { user, workspace } = await requireWorkspace();

  const connection = await prisma.providerConnection.findFirst({
    where: {
      workspaceId: workspace.id,
      type: "EMAIL",
      providerName,
    },
  });

  if (!connection) return;

  await prisma.$transaction([
    prisma.providerConnection.delete({ where: { id: connection.id } }),
    prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "email_connection.disconnected",
        entityType: "provider_connection",
        entityId: connection.id,
        metadata: { providerName },
      },
    }),
  ]);

  revalidatePath("/settings/email");
  revalidatePath("/outreach");
}
