"use client";

import { useActionState } from "react";
import {
  findLeadPublicEmailsAction,
  type PublicContactEnrichmentState,
} from "@/app/(app)/leads/contact-enrichment-actions";

const initialState: PublicContactEnrichmentState = { message: null, error: null };

export function FindPublicEmailsButton({ leadId, fi }: { leadId: string; fi: boolean }) {
  const [state, action, pending] = useActionState(
    findLeadPublicEmailsAction.bind(null, leadId),
    initialState,
  );

  return (
    <div className="mt-5 space-y-3">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-sky-400/25 bg-sky-400/[0.08] px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/[0.15] disabled:cursor-wait disabled:opacity-50"
        >
          {pending
            ? fi ? "Etsitään julkisia yhteystietoja..." : "Looking up public contacts..."
            : fi ? "Etsi julkiset sähköpostit" : "Find public emails"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="text-xs leading-5 text-red-300">{state.error}</p>
      )}
      {state.message && (
        <p role="status" className="text-xs leading-5 text-slate-300">{state.message}</p>
      )}
    </div>
  );
}
