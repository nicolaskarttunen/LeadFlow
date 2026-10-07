"use client";

import { useActionState } from "react";
import {
  generateLeadEmailDraftAction,
  type EmailDraftActionState,
} from "@/app/(app)/leads/email-draft-actions";

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
