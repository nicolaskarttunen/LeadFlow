import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="text-center">
        <div className="text-sm text-slate-500">404</div>
        <h1 className="mt-3 text-2xl font-semibold">Not found</h1>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
