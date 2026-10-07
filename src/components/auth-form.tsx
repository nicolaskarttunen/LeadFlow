"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10";

function verificationPath(email: string) {
  return `/verify-email?email=${encodeURIComponent(email)}`;
}

function isEmailNotVerifiedError(error: unknown) {
  const value = error as { status?: number; code?: string } | null;
  return value?.status === 403 || value?.code === "EMAIL_NOT_VERIFIED";
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    try {
      const result = await signUp.email({
        name: String(form.get("name") ?? "").trim(),
        email,
        password: String(form.get("password") ?? ""),
        callbackURL: "/onboarding",
      });

      if (result.error) {
        setError(result.error.message ?? "Tilin luominen epäonnistui.");
        return;
      }

      router.push(verificationPath(email));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Nimi</span>
        <input name="name" required autoComplete="name" className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Sähköposti</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Salasana</span>
        <input
          name="password"
          type="password"
          minLength={8}
          maxLength={128}
          required
          autoComplete="new-password"
          className={inputClass}
        />
        <span className="mt-1.5 block text-xs text-slate-500">Vähintään 8 merkkiä.</span>
      </label>

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
      >
        {pending ? "Luodaan tiliä..." : "Luo tili ja aloita kokeilu"}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Vahvistamme sähköpostiosoitteesi ennen kuin LeadFlow otetaan käyttöön.
      </p>

      <p className="text-center text-sm text-slate-400">
        Onko sinulla jo tili?{" "}
        <Link href="/sign-in" className="text-slate-200 hover:text-white">
          Kirjaudu sisään
        </Link>
      </p>
    </form>
  );
}

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    try {
      const result = await signIn.email({
        email,
        password: String(form.get("password") ?? ""),
      });

      if (result.error) {
        if (isEmailNotVerifiedError(result.error)) {
          router.push(verificationPath(email));
          return;
        }
        setError(result.error.message ?? "Kirjautuminen epäonnistui.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Sähköposti</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Salasana</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
      >
        {pending ? "Kirjaudutaan..." : "Kirjaudu sisään"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Uusi LeadFlow'ssa?{" "}
        <Link href="/sign-up" className="text-slate-200 hover:text-white">
          Luo tili
        </Link>
      </p>
    </form>
  );
}
