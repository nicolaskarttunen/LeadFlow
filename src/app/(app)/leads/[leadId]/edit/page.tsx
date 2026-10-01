import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { LeadForm } from "@/components/lead-form";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      workspaceId: workspace.id,
    },
    include: {
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  if (!lead) {
    notFound();
  }

  const contact = lead.contacts[0];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/leads/${lead.id}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← Back to lead
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit lead</h1>

      <div className="mt-7">
        <LeadForm
          leadId={lead.id}
          initialValues={{
            companyName: lead.companyName,
            domain: lead.domain,
            website: lead.website,
            industry: lead.industry,
            location: lead.location,
            companySize: lead.companySize,
            description: lead.description,
            whyRelevant: lead.whyRelevant,
            potentialService: lead.potentialService,
            contactName: contact?.name,
            jobTitle: contact?.jobTitle,
            email: contact?.email,
          }}
        />
      </div>
    </div>
  );
}
