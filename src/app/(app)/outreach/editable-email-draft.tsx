"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveEmailDraftEditsAction,
  type EditEmailDraftState,
} from "@/app/(app)/outreach/actions";

const initialState: EditEmailDraftState = { error: null, saved: false };

export function EditableEmailDraft({
  draftId,
  subject,
  body,
  editable,
  fi,
}: {
  draftId: string;
  subject: string;
  body: string;
  editable: boolean;
  fi: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, saveAction, pending] = useActionState(
    saveEmailDraftEditsAction.bind(null, draftId),
    initialState,
  );

  useEffect(() => {
    if (state.saved) setEditing(false);
  }, [state.saved]);

  return (
    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 p-4">
      {editing ? (
        <form action={saveAction} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {fi ? "Aihe" : "Subject"}
            </span>
            <input
              key={draftId + subject}
              type="text"
              name="subject"
              required
              maxLength={180}
              defaultValue={subject}
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {fi ? "Viesti" : "Message"}
            </span>
            <textarea
              key={draftId + body}
              name="body"
              required
              minLength={20}
              maxLength={5000}
              rows={10}
              defaultValue={body}
              className="w-full resize-y rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-violet-400"
            />
          </label>
          {state.error ? (
            <p role="alert" className="text-xs text-red-300">{state.error}</p>
          ) : null}
          <p className="text-xs leading-5 text-slate-500">
            {fi
              ? "Tarkista, että viesti perustuu oikeisiin yrityshavaintoihin. Muokkaus palauttaa aiemmin hyväksytyn viestin tarkistettavaksi."
              : "Ensure all claims are grounded in research. Editing a previously approved message resets its approval."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending}
              className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50">
              {pending ? (fi ? "Tallennetaan..." : "Saving...") : (fi ? "Tallenna muutokset" : "Save changes")}
            </button>
            <button type="button" disabled={pending} onClick={() => setEditing(false)}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05]">
              {fi ? "Peruuta" : "Cancel"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {fi ? "Aihe" : "Subject"}
            </div>
            {editable ? (
              <button type="button" onClick={() => setEditing(true)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-white/[0.06]">
                {fi ? "Muokkaa viestiä" : "Edit draft"}
              </button>
            ) : null}
          </div>
          <div className="mt-1.5 text-sm font-medium text-slate-200">{subject}</div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {fi ? "Viesti" : "Message"}
          </div>
          <div className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-300">{body}</div>
        </>
      )}
    </div>
  );
}
