"use client";

import { useFormStatus } from "react-dom";

export function AnalyzeLeadButton({ locale = "fi" }: { locale?: "fi" | "en" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60">
      {pending
        ? (locale === "fi" ? "Analysoidaan…" : "Analyzing…")
        : (locale === "fi" ? "Analysoi automaattisesti" : "Analyze automatically")}
    </button>
  );
}
