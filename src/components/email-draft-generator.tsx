"use client";

import { useActionState } from "react";
import {
  generateLeadEmailDraftAction,
  type EmailDraftActionState,
} from "@/app/(app)/leads/email-draft-actions";
import { enrichLeadContactsAction } from "@/app/(app)/leads/contact-actions";

const initialState: EmailDraftActionState = { error: null, message: null };

export function EmailDraftGenerator({
  leadId,
  hasDraft,
  locale,
}: {
  leadId: string;
  hasDraft: boolean;
  locale: "fi" | "en";
}) {
  const fi = locale === "fi";
  const [state, action, pending] = useActionState(
    generateLeadEmailDraftAction.bind(null, leadId),
    initialState,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <form action={enrichLeadContactsAction.bind(null, leadId)}>
          <button
            type="submit"
            className="rounded-xl border border-sky-400/20 bg-sky-400/[0.07] px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/[0.12]"
          >
            {fi ? "Etsi julkinen sähköposti" : "Find public email"}
          </button>
        </form>

        <form action={action}>
          <button
            disabled={pending}
            className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? fi
                ? "Luodaan luonnosta..."
                : "Generating draft..."
              : hasDraft
                ? fi
                  ? "Luo uusi versio"
                  : "Generate new version"
                : fi
                  ? "Luo sähköpostiluonnos"
                  : "Generate email draft"}
          </button>
        </form>
      </div>

      {state.error ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs leading-5 text-red-200">
          {state.error}
        </div>
      ) : null}
      {state.message ? (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs leading-5 text-emerald-200">
          {state.message}
        </div>
      ) : null}
    </div>
  );
}
