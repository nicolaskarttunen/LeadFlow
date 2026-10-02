"use client";

import { useFormStatus } from "react-dom";

export function ResearchLeadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Tutkitaan…" : "Tutki yritys"}
    </button>
  );
}
