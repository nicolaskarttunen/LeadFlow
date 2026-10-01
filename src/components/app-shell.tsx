import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
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
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-black/15 p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-8">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            LeadFlow
          </Link>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="truncate text-sm font-medium text-slate-100">
              {workspaceName}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">{userName}</div>
          </div>
        </div>

        <nav className="flex gap-2 lg:flex-col">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 lg:mt-[calc(100vh-270px)]">
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 p-5 sm:p-7 lg:p-10">{children}</main>
    </div>
  );
}
