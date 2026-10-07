import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getBillingOverview } from "@/lib/billing/subscription";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireWorkspace();
  const billing = await getBillingOverview(workspace.id);

  if (billing.trialNotStarted) {
    redirect("/choose-plan");
  }

  const [newLeadCount, currentUser] = await Promise.all([
    prisma.lead.count({ where: { workspaceId: workspace.id, reviewStatus: "PENDING" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } }),
  ]);
  const locale = currentUser?.locale === "en" ? "en" : "fi";

  return <AppShell workspaceName={workspace.name} userName={user.name} newLeadCount={newLeadCount} locale={locale}>{children}</AppShell>;
}
