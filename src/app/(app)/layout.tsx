import { AppShell } from "@/components/app-shell";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await requireWorkspace();
  const newLeadCount = await prisma.lead.count({
    where: { workspaceId: workspace.id, status: "NEW" },
  });

  return (
    <AppShell workspaceName={workspace.name} userName={user.name} newLeadCount={newLeadCount}>
      {children}
    </AppShell>
  );
}
