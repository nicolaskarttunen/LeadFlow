import Link from "next/link";
import { DiscoveryForm } from "@/components/discovery-form";
import { requireWorkspace } from "@/lib/workspace";
export default async function DiscoverLeadsPage() {
  await requireWorkspace();
  return <div className="mx-auto max-w-5xl">
    <Link href="/leads" className="text-sm text-slate-400 transition hover:text-white">← Back to leads</Link>
    <div className="mt-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Lead discovery</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Find relevant prospects</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Define a focused search and review the discovered companies in your lead pipeline.</p></div>
    <div className="mt-7"><DiscoveryForm /></div>
  </div>;
}
