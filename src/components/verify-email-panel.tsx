"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function VerifyEmailPanel({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resendVerification() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/onboarding",
      });

      if (result.error) {
        setError(result.error.message ?? "Vahvistusviestin lähetys epäonnistui.");
        return;
      }

      setMessage("Uusi vahvistusviesti lähetettiin. Tarkista myös roskapostikansio.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.055] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
          Vahvistus odottaa
        </div>
        <div className="mt-2 break-all text-sm font-medium text-slate-100">{email}</div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Lähetimme tähän osoitteeseen vahvistuslinkin. Linkki on voimassa tunnin.
        </p>
      </div>

      <div className="space-y-2 text-sm leading-6 text-slate-400">
        <p>1. Avaa LeadFlow'n lähettämä sähköposti.</p>
        <p>2. Paina “Vahvista sähköposti”.</p>
        <p>3. Palaat automaattisesti yrityksesi käyttöönottoon.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={resendVerification}
        disabled={pending}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.07] disabled:opacity-50"
      >
        {pending ? "Lähetetään..." : "Lähetä vahvistusviesti uudelleen"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Väärä sähköpostiosoite?{" "}
        <Link href="/sign-up" className="text-slate-300 hover:text-white">
          Palaa rekisteröitymiseen
        </Link>
      </p>
    </div>
  );
}
