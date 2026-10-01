import Link from "next/link";
import { LeadForm } from "@/components/lead-form";
import { requireWorkspace } from "@/lib/workspace";

export default async function NewLeadPage() {
  await requireWorkspace();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-300">
        ← Back to leads
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Add lead</h1>
      <p className="mt-2 text-sm text-slate-500">
        Manual creation is the first working discovery provider.
      </p>

      <div className="mt-7">
        <LeadForm />
      </div>
    </div>
  );
}
