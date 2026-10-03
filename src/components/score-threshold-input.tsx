"use client";

import { useState } from "react";

export function ScoreThresholdInput({ fi, defaultValue = 80 }: { fi: boolean; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const setSafe = (next: number) => setValue(Math.max(0, Math.min(100, Math.round(next))));
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/[0.1] bg-slate-950 focus-within:border-violet-400/50">
      <button type="button" aria-label={fi ? "Pienennä pisterajaa" : "Decrease score threshold"} onClick={() => setSafe(value - 1)} className="flex w-9 items-center justify-center border-r border-white/[0.08] bg-white/[0.035] text-base font-semibold text-slate-400 transition hover:bg-violet-500/15 hover:text-violet-300">−</button>
      <input name="scoreThreshold" type="number" min="0" max="100" value={value} onChange={(event) => setSafe(Number(event.target.value) || 0)} className="w-16 appearance-none bg-transparent px-2 py-2.5 text-center text-sm font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <button type="button" aria-label={fi ? "Nosta pisterajaa" : "Increase score threshold"} onClick={() => setSafe(value + 1)} className="flex w-9 items-center justify-center border-l border-white/[0.08] bg-white/[0.035] text-base font-semibold text-slate-400 transition hover:bg-violet-500/15 hover:text-violet-300">+</button>
    </div>
  );
}
