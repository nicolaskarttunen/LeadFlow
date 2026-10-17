"use client";

import { useState, useTransition } from "react";
import { sendApprovedGmailDraftAction } from "./actions";

export function SendGmailButton({ draftId, recipient, sender, fi }: {
  draftId: string; recipient: string; sender: string; fi: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => setConfirming(true)}
        className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50">
        {fi ? "Lähetä Gmailista" : "Send via Gmail"}
      </button>
      {confirming && (
        <div className="rounded-xl border border-amber-400/30 bg-black/30 p-3 text-xs text-slate-200">
          <p>{fi ? "Lähetetäänkö viesti oikeasti?" : "Really send this email?"}</p>
          <p className="mt-2 break-all">{sender} → {recipient}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={pending} onClick={() => {
              setError("");
              startTransition(async () => {
                try {
                  await sendApprovedGmailDraftAction(draftId);
                  setConfirming(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Lähetys epäonnistui.");
                }
              });
            }} className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-white disabled:opacity-50">
              {pending ? "..." : fi ? "Vahvista lähetys" : "Confirm send"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)}
              className="rounded-lg border border-white/20 px-3 py-2">
              {fi ? "Peruuta" : "Cancel"}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
