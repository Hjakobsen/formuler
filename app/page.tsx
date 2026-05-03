"use client";

import { useMemo, useState } from "react";

type ContextOption =
  | "Melding til foresatte"
  | "Oppfølging etter samtale"
  | "Nøytral statusoppdatering";

type SeverityOption =
  | "Mild / orienterende"
  | "Tydelig / bekymringsformidling";

type FollowUpOption =
  | "Kun til informasjon"
  | "Kort telefonsamtale"
  | "Foreslå møte"
  | "Åpen dialog (AI velger)";

type ReferenceOption = "Eleven" | "Barnet" | "Bruk navn";

const CONTEXT_OPTIONS: ContextOption[] = [
  "Melding til foresatte",
  "Oppfølging etter samtale",
  "Nøytral statusoppdatering",
];

const SEVERITY_OPTIONS: SeverityOption[] = [
  "Mild / orienterende",
  "Tydelig / bekymringsformidling",
];

const FOLLOWUP_OPTIONS: FollowUpOption[] = [
  "Kun til informasjon",
  "Kort telefonsamtale",
  "Foreslå møte",
  "Åpen dialog (AI velger)",
];

const REFERENCE_OPTIONS: ReferenceOption[] = ["Eleven", "Barnet", "Bruk navn"];

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [context, setContext] = useState<ContextOption>("Melding til foresatte");
  const [severity, setSeverity] = useState<SeverityOption>("Mild / orienterende");
  const [followUp, setFollowUp] = useState<FollowUpOption>("Åpen dialog (AI velger)");

  const [reference, setReference] = useState<ReferenceOption>("Eleven");
  const [studentName, setStudentName] = useState("");

  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const rawTooShort = useMemo(() => rawText.trim().length < 10, [rawText]);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 2000);
  }

  async function generateMessage() {
    if (rawTooShort) {
      showToast("Skriv minst 10 tegn.");
      return;
    }

    // Navn er valgfritt, men hvis bruker har valgt "Bruk navn" og feltet er tomt:
    // vi faller tilbake til "Eleven" for å unngå friksjon.
    const safeReference: ReferenceOption = reference === "Bruk navn" && !studentName.trim() ? "Eleven" : reference;

    setLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Mode: "FULL_MELDING",
          Kontekst: context,
          Alvorlighetsnivå: severity,
          Oppfølging: followUp,
          Referanseform: safeReference,
          Elevnavn: safeReference === "Bruk navn" ? studentName.trim() : "",
          Råtekst: rawText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Noe gikk galt.");
        return;
      }

      setResult(data.text);
      showToast("Utkast klart");
    } catch {
      showToast("Kunne ikke kontakte serveren.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result.trim()) return;
    await navigator.clipboard.writeText(result);
    showToast("Tekst kopiert");
  }

  function resetAll() {
    setResult("");
    setRawText("");
    setContext("Melding til foresatte");
    setSeverity("Mild / orienterende");
    setFollowUp("Åpen dialog (AI velger)");
    setReference("Eleven");
    setStudentName("");
    showToast("Nullstilt");
  }

  function resetDraft() {
    setResult("");
    showToast("Utkast fjernet");
  }

  const statusLabel = loading ? "Genererer…" : result.trim() ? "Utkast klart" : "Klar";

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200/70 bg-white/75 px-5 py-4 shadow-[0_12px_36px_-26px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:px-6 sm:py-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Formuler</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Generer profesjonelle meldinger til foresatte basert på lærerens observasjoner.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.55)]">
              <span
                className={cx(
                  "mr-2 inline-block h-2 w-2 rounded-full",
                  loading ? "bg-slate-400" : result.trim() ? "bg-slate-900" : "bg-slate-300"
                )}
              />
              {statusLabel}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-7 sm:gap-8 lg:grid-cols-2 lg:gap-8">
          {/* Input */}
          <section className="rounded-3xl border border-slate-200/70 bg-white shadow-[0_14px_36px_-26px_rgba(15,23,42,0.38)]">
            <div className="border-b border-slate-100/80 px-6 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  1
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Observasjon</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Hold deg til fakta. Du kan skrive stikkord. Du kan redigere utkastet etterpå.
              </p>
            </div>

            <div className="space-y-7 px-6 py-6 sm:space-y-8 sm:px-7">
              {/* Råtekst */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Hva har du observert?</label>
                <textarea
                  rows={8}
                  className={cx(
                    "w-full rounded-2xl border bg-slate-50/65 px-4 py-3.5 text-sm leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition-colors sm:text-[0.95rem]",
                    "border-slate-200/90 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70 focus-visible:border-slate-300 focus-visible:ring-4 focus-visible:ring-slate-200/70",
                    rawTooShort && rawText.trim().length > 0 ? "border-slate-300" : ""
                  )}
                  placeholder='Eksempel: "I timen avbrøt eleven flere ganger, forlot plassen og trengte støtte for å komme i gang."'
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="leading-5">Skriv minst 10 tegn. Ikke bruk fullt navn eller sensitive detaljer.</span>
                  {rawTooShort ? (
                    <span className={cx(rawText.trim().length > 0 ? "text-slate-700" : "")}>{rawText.trim().length}/10</span>
                  ) : (
                    <span className="font-medium text-emerald-600">✓ Klar</span>
                  )}
                </div>
              </div>

              {/* Settings */}
              <section className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Tilpass melding</h3>
                    <p className="mt-1 text-sm text-slate-600">Velg hvordan utkastet skal formuleres.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* Kontekst */}
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-900">Kontekst</div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <div className="grid grid-cols-1 gap-1">
                          {CONTEXT_OPTIONS.map((opt) => {
                            const active = context === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setContext(opt)}
                                className={cx(
                                  "w-full min-h-11 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                                  active
                                    ? "border border-slate-800/90 bg-slate-900 text-slate-50 shadow-[0_1px_1px_rgba(15,23,42,0.12)]"
                                    : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Alvorlighetsnivå */}
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-900">Alvorlighetsnivå</div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <div className="grid grid-cols-1 gap-1">
                          {SEVERITY_OPTIONS.map((opt) => {
                            const active = severity === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setSeverity(opt)}
                                className={cx(
                                  "w-full min-h-11 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                                  active
                                    ? "border border-slate-800/90 bg-slate-900 text-slate-50 shadow-[0_1px_1px_rgba(15,23,42,0.12)]"
                                    : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Oppfølging */}
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-900">Ønsket oppfølging</div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {FOLLOWUP_OPTIONS.map((opt) => {
                          const active = followUp === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFollowUp(opt)}
                              className={cx(
                                "w-full min-h-11 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                                active
                                  ? "border border-slate-800/90 bg-slate-900 text-slate-50 shadow-[0_1px_1px_rgba(15,23,42,0.12)]"
                                  : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Referanseform */}
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-900">Hvordan omtales eleven?</div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                        {REFERENCE_OPTIONS.map((opt) => {
                          const active = reference === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setReference(opt)}
                              className={cx(
                                "w-full min-h-11 rounded-xl px-3 py-2 text-left text-sm font-medium leading-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                                active
                                  ? "border border-slate-800/90 bg-slate-900 text-slate-50 shadow-[0_1px_1px_rgba(15,23,42,0.12)]"
                                  : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {reference === "Bruk navn" && (
                      <div className="mt-3">
                        <label className="mb-2 block text-sm font-medium text-slate-900">Elevens fornavn</label>
                        <input
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="F.eks. Ola"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Bruk fornavn. Hvis feltet er tomt, brukes automatisk “eleven”.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={generateMessage}
                  disabled={loading || rawTooShort}
                  className={cx(
                    "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    "bg-slate-900 text-white shadow-[0_8px_20px_-14px_rgba(15,23,42,0.7)] hover:bg-slate-800",
                    "disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-200"
                  )}
                >
                  {loading ? "Genererer…" : "Generer utkast"}
                </button>

                <button
                  onClick={resetAll}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Nullstill
                </button>

                <div className="sm:ml-auto">
                  <span className="text-xs text-slate-500">Du kan alltid redigere utkastet før bruk.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Result */}
          <section className="rounded-3xl border border-slate-200/70 bg-white shadow-[0_14px_36px_-26px_rgba(15,23,42,0.38)] lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100/80 px-6 py-5 sm:px-7">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    3
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900">Utkast</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">Rediger fritt før du sender.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyResult}
                  disabled={!result.trim()}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Kopier
                </button>
                <button
                  onClick={resetDraft}
                  disabled={!result.trim()}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Tøm
                </button>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-7">
              {!result.trim() ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Ingen utkast ennå</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Fyll inn observasjon og trykk <span className="font-medium">Generer utkast</span>.
                  </p>
                </div>
              ) : (
                <textarea
                  rows={12}
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-4 text-sm leading-7 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-colors sm:px-5 sm:text-[0.95rem] focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200/70"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                />
              )}
            </div>
          </section>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
            <div className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
              {toast}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}