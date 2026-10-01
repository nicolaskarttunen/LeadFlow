import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/workspace";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await requireWorkspace();

  return (
    <AppShell workspaceName={workspace.name} userName={user.name}>
      {children}
    </AppShell>
  );
}
