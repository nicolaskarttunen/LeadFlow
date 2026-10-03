"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  askCopilotAction,
  type CopilotState,
} from "@/app/(app)/copilot/actions";

type Locale = "fi" | "en";

const initialState: CopilotState = { messages: [], error: null };

function isLeadDetail(pathname: string) {
  const match = pathname.match(/^\/leads\/([^/]+)$/);
  const value = match?.[1];
  return Boolean(value && value !== "discover" && value !== "newly-found");
}

export function LeadFlowCopilot({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState(askCopilotAction, initialState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fi = locale === "fi";
  const onLead = isLeadDetail(pathname);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, state.messages.length, pending]);

  const suggestions = onLead
    ? fi
      ? [
          "Miksi tämä on hyvä liidi?",
          "Mitä tälle yritykselle kannattaa tarjota?",
          "Mitä tietoa tästä liidistä vielä puuttuu?",
          "Mikä olisi paras seuraava myyntitoimi?",
        ]
      : [
          "Why is this a good lead?",
          "What should we offer this company?",
          "What information is still missing?",
          "What is the best next sales action?",
        ]
    : fi
      ? [
          "Mitkä liidit kannattaa käsitellä ensin?",
          "Miltä myyntiputkeni näyttää?",
          "Mitä minun kannattaa tehdä seuraavaksi?",
        ]
      : [
          "Which leads should I handle first?",
          "How does my pipeline look?",
          "What should I do next?",
        ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-violet-950/50 transition hover:bg-violet-400"
        aria-label={fi ? "Avaa LeadFlow AI Copilot" : "Open LeadFlow AI Copilot"}
      >
        <span className="text-base">✦</span>
        <span className="hidden sm:inline">AI Copilot</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label={fi ? "Sulje Copilot" : "Close Copilot"}
          />

          <aside className="relative flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#0b0d13] shadow-2xl shadow-black/50">
            <header className="border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">✦</span>
                  <div>
                    <div className="font-semibold text-slate-100">LeadFlow AI Copilot</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {onLead
                        ? fi ? "Tuntee tämän liidin ja myyntiprofiilisi" : "Knows this lead and your sales profile"
                        : fi ? "Tuntee myyntiprofiilisi ja liidiputkesi" : "Knows your sales profile and pipeline"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-lg text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                  aria-label={fi ? "Sulje" : "Close"}
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {state.messages.length === 0 ? (
                <div>
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-4">
                    <div className="text-sm font-semibold text-slate-100">
                      {fi ? "Miten voin auttaa?" : "How can I help?"}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-400">
                      {onLead
                        ? fi
                          ? "Voin selittää tämän liidin, arvioida myyntimahdollisuutta ja ehdottaa seuraavaa toimintoa LeadFlow'n keräämän tiedon perusteella."
                          : "I can explain this lead, assess the sales opportunity and suggest the next action using LeadFlow's evidence."
                        : fi
                          ? "Voin auttaa priorisoimaan liidejä, tulkitsemaan myyntiputkea ja päättämään mitä kannattaa tehdä seuraavaksi."
                          : "I can help prioritize leads, interpret your pipeline and decide what to do next."}
                    </p>
                  </div>

                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {fi ? "Kokeile esimerkiksi" : "Try asking"}
                  </div>
                  <div className="mt-2 space-y-2">
                    {suggestions.map((suggestion) => (
                      <form action={action} key={suggestion}>
                        <input type="hidden" name="pathname" value={pathname} />
                        <button
                          type="submit"
                          name="message"
                          value={suggestion}
                          disabled={pending}
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-left text-sm text-slate-300 transition hover:border-violet-400/25 hover:bg-white/[0.045] hover:text-white disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.messages.map((item, index) => (
                    <div
                      key={`${item.role}-${index}`}
                      className={item.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          item.role === "user"
                            ? "max-w-[88%] rounded-2xl rounded-br-md bg-violet-500 px-4 py-3 text-sm leading-6 text-white"
                            : "max-w-[94%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-200"
                        }
                      >
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pending ? (
                <div className="mt-4 flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-slate-400">
                    <span className="mr-2 inline-block animate-pulse text-violet-300">✦</span>
                    {fi ? "Tutkin LeadFlow'n tietoja..." : "Reviewing LeadFlow data..."}
                  </div>
                </div>
              ) : null}

              {state.error ? (
                <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-200">
                  {state.error}
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/[0.08] bg-black/20 p-4">
              <form
                action={action}
                onSubmit={() => {
                  if (message.trim()) setTimeout(() => setMessage(""), 0);
                }}
                className="flex items-end gap-2"
              >
                <input type="hidden" name="pathname" value={pathname} />
                <textarea
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={2}
                  placeholder={fi ? "Kysy LeadFlow'lta..." : "Ask LeadFlow..."}
                  className="max-h-32 min-h-[50px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/40"
                />
                <button
                  type="submit"
                  disabled={pending || !message.trim()}
                  className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-lg font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={fi ? "Lähetä" : "Send"}
                >
                  ↑
                </button>
              </form>
              <p className="mt-2 px-1 text-[10px] leading-4 text-slate-600">
                {fi
                  ? "Copilot käyttää LeadFlow'n tallennettua kontekstia. Tarkista tärkeät päätökset ennen toimintaa."
                  : "Copilot uses context stored in LeadFlow. Review important decisions before acting."}
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
