"use client";

import { KeyboardEvent, useMemo, useState } from "react";

type MultiChoiceFieldProps = {
  name: string;
  suggestions: string[];
  defaultValues?: string[];
  addLabel: string;
  placeholder: string;
  emptyLabel?: string;
};

export function MultiChoiceField({
  name,
  suggestions,
  defaultValues = [],
  addLabel,
  placeholder,
  emptyLabel,
}: MultiChoiceFieldProps) {
  const [selected, setSelected] = useState<string[]>(() =>
    Array.from(new Set(defaultValues.map((value) => value.trim()).filter(Boolean))),
  );
  const [customValue, setCustomValue] = useState("");

  const allChoices = useMemo(
    () => Array.from(new Set([...suggestions, ...selected])),
    [suggestions, selected],
  );

  function toggle(value: string) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function addCustom() {
    const value = customValue.trim();
    if (!value) return;
    setSelected((current) =>
      current.some((item) => item.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value],
    );
    setCustomValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCustom();
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(", ")} />

      <div className="flex flex-wrap gap-2">
        {allChoices.map((choice) => {
          const active = selected.includes(choice);
          return (
            <button
              key={choice}
              type="button"
              onClick={() => toggle(choice)}
              aria-pressed={active}
              className={
                active
                  ? "rounded-xl border border-violet-400/45 bg-violet-500/15 px-3.5 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
                  : "rounded-xl border border-white/10 bg-white/[0.025] px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:border-violet-400/30 hover:text-slate-100"
              }
            >
              <span className="mr-1.5">{active ? "✓" : "+"}</span>
              {choice}
            </button>
          );
        })}
      </div>

      {selected.length === 0 && emptyLabel ? (
        <p className="mt-2 text-xs text-slate-500">{emptyLabel}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/40"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customValue.trim()}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-violet-400/30 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
