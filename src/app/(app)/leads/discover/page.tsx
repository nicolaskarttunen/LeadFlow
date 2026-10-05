import Link from "next/link";
import { DiscoveryForm } from "@/components/discovery-form";
import { getCurrentLocale } from "@/lib/current-locale";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function DiscoverLeadsPage() {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";

  const [profile, company] = await Promise.all([
    prisma.idealCustomerProfile.findFirst({
      where: { workspaceId: workspace.id, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        targetCustomer: true,
        industries: true,
        regions: true,
        companySize: true,
        keywords: true,
      },
    }),
    prisma.companyProfile.findUnique({
      where: { workspaceId: workspace.id },
      select: { offering: true, description: true },
    }),
  ]);

  const salesProfile = profile
    ? {
        offering: company?.offering ?? company?.description ?? "",
        targetCustomer: profile.targetCustomer ?? "",
        industries: profile.industries,
        regions: profile.regions,
        companySize: profile.companySize ?? "",
        signals: profile.keywords,
      }
    : null;

  return <div className="mx-auto max-w-5xl">
    <Link href="/leads" className="text-sm text-slate-400 transition hover:text-white">← {fi ? "Takaisin liideihin" : "Back to leads"}</Link>
    <div className="mt-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Liidien etsintä" : "Lead discovery"}</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Löydä potentiaalisia asiakkaita" : "Find relevant prospects"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{fi ? "LeadFlow käyttää Myyntiprofiiliasi löytääkseen yrityksiä, jotka sopivat siihen mitä myyt ja kenelle myyt." : "LeadFlow uses your Sales profile to find companies that fit what you sell and who you sell to."}</p>
    </div>
    <div className="mt-7"><DiscoveryForm locale={locale} profile={salesProfile} /></div>
  </div>;
}
