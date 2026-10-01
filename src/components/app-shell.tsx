import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: "⌂" },
  { href: "/leads", label: "Leads", icon: "◎" },
];

export function AppShell({
  workspaceName,
  userName,
  children,
}: {
  workspaceName: string;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/[0.08] bg-black/20 px-4 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div>
          <Link href="/dashboard" className="flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-sm font-bold text-white shadow-lg shadow-violet-950/40">LF</span>
            <span>
              <span className="block text-[15px] font-semibold tracking-tight">LeadFlow</span>
              <span className="block text-[11px] text-slate-400">Research & outreach</span>
            </span>
          </Link>

          <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Workspace</div>
            <div className="mt-2 truncate text-sm font-semibold text-slate-100">{workspaceName}</div>
            <div className="mt-1 truncate text-xs text-slate-400">{userName}</div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="group flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-xs text-slate-400 group-hover:text-violet-300">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 border-t border-white/[0.08] pt-4 lg:mt-auto">
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-7 lg:p-10 xl:p-12">{children}</main>
    </div>
  );
}
