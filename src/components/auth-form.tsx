"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);

    try {
      const result = await signUp.email({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to create account.");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Name</span>
        <input name="name" required autoComplete="name" className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Password</span>
        <input
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
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
        className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-slate-200 hover:text-white">
          Sign in
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

    try {
      const result = await signIn.email({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to sign in.");
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
        <span className="mb-2 block text-slate-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Password</span>
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
        className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        New to LeadFlow?{" "}
        <Link href="/sign-up" className="text-slate-200 hover:text-white">
          Create account
        </Link>
      </p>
    </form>
  );
}
