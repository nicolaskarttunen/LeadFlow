"use client";

import { useActionState } from "react";
import { saveSmtpConnectionAction, type SmtpConnectionState } from "./smtp-actions";

const initialState: SmtpConnectionState = { error: null, message: null };

export function SmtpConnectionForm() {
  const [state, action, pending] = useActionState(saveSmtpConnectionAction, initialState);
  return (
    <form action={action} className="mt-5 space-y-4 rounded-2xl border border-white/10 p-5">
      <p className="text-xs leading-5 text-slate-400">
        Zoner ja muut SMTP-palvelut. Lähetys ei vielä aktivoidu tallennuksesta, vaan yhteys tarkistetaan seuraavassa vaiheessa.
      </p>
      <label className="block text-sm text-slate-200">Lähettäjän sähköpostiosoite
        <input required name="email" type="email" autoComplete="email" placeholder="info@yritys.fi" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white" />
      </label>
      <label className="block text-sm text-slate-200">SMTP-palvelin
        <input required name="host" placeholder="smtp.yritys.fi" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white" />
      </label>
      <label className="block text-sm text-slate-200">Portti
        <select name="port" defaultValue="587" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white">
          <option value="587">587 – STARTTLS</option>
          <option value="465">465 – TLS</option>
        </select>
      </label>
      <label className="block text-sm text-slate-200">Käyttäjätunnus
        <input required name="username" autoComplete="username" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white" />
      </label>
      <label className="block text-sm text-slate-200">Sähköpostipalvelun sovellussalasana tai salasana
        <input required name="password" type="password" autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white" />
      </label>
      {state.error ? <p role="alert" className="text-sm text-red-300">{state.error}</p> : null}
      {state.message ? <p role="status" className="text-sm text-emerald-300">{state.message}</p> : null}
      <button disabled={pending} type="submit" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Tallennetaan..." : "Tallenna SMTP-asetukset"}
      </button>
    </form>
  );
}
