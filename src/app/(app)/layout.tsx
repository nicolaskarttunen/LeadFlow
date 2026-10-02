import { AppShell } from "@/components/app-shell";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireWorkspace();
  const [newLeadCount, currentUser] = await Promise.all([
    prisma.lead.count({ where: { workspaceId: workspace.id, status: "NEW" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } }),
  ]);
  const locale = currentUser?.locale === "en" ? "en" : "fi";

  return <AppShell workspaceName={workspace.name} userName={user.name} newLeadCount={newLeadCount} locale={locale}>{children}</AppShell>;
}
