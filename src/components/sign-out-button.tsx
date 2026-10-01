"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
