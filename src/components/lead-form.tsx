"use client";

import { useActionState } from "react";
import {
  createLeadAction,
  updateLeadAction,
  type LeadActionState,
} from "@/app/(app)/leads/actions";

export type LeadFormInitialValues = {
  companyName?: string | null;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  companySize?: string | null;
  description?: string | null;
  whyRelevant?: string | null;
  potentialService?: string | null;
  contactName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
};

const input =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10";
const label = "mb-2 block text-sm font-medium text-slate-300";

const initialState: LeadActionState = {
  error: null,
};

export function LeadForm({
  leadId,
  initialValues = {},
}: {
  leadId?: string;
  initialValues?: LeadFormInitialValues;
}) {
  const action = leadId
    ? updateLeadAction.bind(null, leadId)
    : createLeadAction;

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:grid-cols-2"
    >
      {state.error ? (
        <div className="sm:col-span-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      <label className="sm:col-span-2">
        <span className={label}>Company name *</span>
        <input
          name="companyName"
          required
          defaultValue={initialValues.companyName ?? ""}
          className={input}
        />
      </label>

      <label>
        <span className={label}>Domain</span>
        <input
          name="domain"
          placeholder="example.com"
          defaultValue={initialValues.domain ?? ""}
          className={input}
        />
      </label>

      <label>
        <span className={label}>Website</span>
        <input
          name="website"
          placeholder="https://example.com"
          defaultValue={initialValues.website ?? ""}
          className={input}
        />
      </label>

      <label>
        <span className={label}>Industry</span>
        <input
          name="industry"
          defaultValue={initialValues.industry ?? ""}
          className={input}
        />
      </label>

      <label>
        <span className={label}>Location</span>
        <input
          name="location"
          defaultValue={initialValues.location ?? ""}
          className={input}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={label}>Company size</span>
        <input
          name="companySize"
          placeholder="1-10 employees"
          defaultValue={initialValues.companySize ?? ""}
          className={input}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={label}>Description</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={initialValues.description ?? ""}
          className={input}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={label}>Why contact this company?</span>
        <textarea
          name="whyRelevant"
          rows={4}
          placeholder="Only write observations you can support. Research automation will populate evidence later."
          defaultValue={initialValues.whyRelevant ?? ""}
          className={input}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={label}>Potential service</span>
        <input
          name="potentialService"
          placeholder="Website redesign, local SEO..."
          defaultValue={initialValues.potentialService ?? ""}
          className={input}
        />
      </label>

      <div className="sm:col-span-2 mt-2 border-t border-white/10 pt-5">
        <h2 className="font-semibold">Primary contact</h2>
        <p className="mt-1 text-xs text-slate-500">
          Optional for now. Enrichment providers will be added behind an interface.
        </p>
      </div>

      <label>
        <span className={label}>Contact name</span>
        <input
          name="contactName"
          defaultValue={initialValues.contactName ?? ""}
          className={input}
        />
      </label>

      <label>
        <span className={label}>Job title</span>
        <input
          name="jobTitle"
          defaultValue={initialValues.jobTitle ?? ""}
          className={input}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={label}>Email</span>
        <input
          name="email"
          type="email"
          defaultValue={initialValues.email ?? ""}
          className={input}
        />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending
            ? "Saving..."
            : leadId
              ? "Save changes"
              : "Create lead"}
        </button>
      </div>
    </form>
  );
}
