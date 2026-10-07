"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { LeadFlowCopilot } from "@/components/leadflow-copilot";

type Locale = "fi" | "en";
const copy = {
  fi: { tagline:"Prospektointi & myynti", workspace:"Työtila", main:"Päänäkymä", overview:"Yleiskatsaus", prospecting:"Prospektointi", leads:"Liidit", newLeads:"Uudet liidit", allLeads:"Kaikki liidit", findLeads:"Etsi liidejä", outreach:"Yhteydenotot", settings:"Asetukset" },
  en: { tagline:"Prospecting & sales", workspace:"Workspace", main:"Main", overview:"Overview", prospecting:"Prospecting", leads:"Leads", newLeads:"New leads", allLeads:"All leads", findLeads:"Find leads", outreach:"Outreach", settings:"Settings" },
} as const;

function Badge({ count }: { count: number }) {
  if (count < 1) return null;
  return <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-violet-950/50">{count > 99 ? "99+" : count}</span>;
}

function NavLink({ href, label, icon, badge = 0 }: { href: string; label: string; icon: string; badge?: number }) {
  const pathname = usePathname();
  const active = pathname === href;
  return <Link href={href} className={`group flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white/[0.07] text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}>
    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-xs text-slate-400 group-hover:text-violet-300">{icon}</span>
    <span>{label}</span><Badge count={badge} />
  </Link>;
}

export function AppShell({ workspaceName, userName, newLeadCount, locale, children }: { workspaceName: string; userName: string; newLeadCount: number; locale: Locale; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const saved = searchParams.get("saved") === "1";
  const onLeadPage = pathname.startsWith("/leads");
  const [leadsOpen, setLeadsOpen] = useState(onLeadPage);
  const [showSaved, setShowSaved] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    if (!saved || pathname !== "/settings/prospecting") return;
    setShowSaved(true);
    const timer = window.setTimeout(() => setShowSaved(false), 3500);
    return () => window.clearTimeout(timer);
  }, [pathname, saved]);

  return <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="border-b border-white/[0.08] bg-black/20 px-4 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
      <div>
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-sm font-bold text-white shadow-lg shadow-violet-950/40">LF</span>
          <span><span className="block text-[15px] font-semibold tracking-tight">LeadFlow</span><span className="block text-[11px] text-slate-400">{t.tagline}</span></span>
        </Link>
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">{t.workspace}</div>
          <div className="mt-1.5 truncate text-sm font-semibold text-slate-100">{workspaceName}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{userName}</div>
        </div>
        <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col">
          <div className="hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 lg:block">{t.main}</div>
          <NavLink href="/dashboard" label={t.overview} icon="⌂" />
          <div className="mt-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 lg:block">{t.prospecting}</div>
          <button type="button" onClick={() => setLeadsOpen((open) => !open)} aria-expanded={leadsOpen} className={`group flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${onLeadPage ? "text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-xs text-slate-400 group-hover:text-violet-300">◎</span>
            <span>{t.leads}</span><Badge count={newLeadCount} /><span className={`ml-1 text-[10px] text-slate-500 transition-transform ${leadsOpen ? "rotate-90" : ""}`}>›</span>
          </button>
          {leadsOpen && <div className="ml-4 space-y-1 border-l border-white/[0.08] pl-2">
            <NavLink href="/leads/newly-found" label={t.newLeads} icon="✦" badge={newLeadCount} />
            <NavLink href="/leads" label={t.allLeads} icon="◎" />
            <NavLink href="/leads/discover" label={t.findLeads} icon="⌕" />
          </div>}
          <NavLink href="/outreach" label={t.outreach} icon="✉" />
        </nav>
      </div>
      <div className="mt-6 border-t border-white/[0.08] pt-4 lg:mt-auto">
        <NavLink href="/settings" label={t.settings} icon="⚙" />
        <div className="mt-1"><SignOutButton locale={locale} /></div>
      </div>
    </aside>
    <main className="min-w-0 p-5 sm:p-7 lg:p-10 xl:p-12">{children}</main>
    {showSaved ? <div className="fixed right-5 top-5 z-[70] rounded-2xl border border-emerald-400/25 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-emerald-200 shadow-2xl shadow-black/40 backdrop-blur-xl">✓ {locale === "fi" ? "Myyntiprofiili tallennettu" : "Sales profile saved"}</div> : null}
    <LeadFlowCopilot locale={locale} />
  </div>;
}
