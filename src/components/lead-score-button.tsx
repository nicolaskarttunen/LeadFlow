"use client";

import { useFormStatus } from "react-dom";

export function LeadScoreButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="mt-4 w-full rounded-xl border border-violet-400/25 bg-violet-400/[0.08] px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/[0.14] disabled:cursor-wait disabled:opacity-60">
      {pending ? "Lasketaan…" : "Laske liidipisteet"}
    </button>
  );
}
