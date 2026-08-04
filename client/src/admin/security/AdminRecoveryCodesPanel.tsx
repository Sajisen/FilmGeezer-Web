import { useState } from "react";

import { copyTextToClipboard } from "../../utils/copyTextToClipboard";

interface AdminRecoveryCodesPanelProps {
  recoveryCodes: string[];
  title?: string;
  description?: string;
  requireAcknowledgement?: boolean;
  continueLabel?: string;
  isWorking?: boolean;
  onContinue?: () => Promise<void>;
}

export default function AdminRecoveryCodesPanel({
  recoveryCodes,
  title = "Save your recovery codes now",
  description = "Each code works once. FilmGeezer will not show this set again. Store the codes outside this browser and away from the device that holds your primary verification method.",
  requireAcknowledgement = false,
  continueLabel = "Continue",
  isWorking = false,
  onContinue,
}: AdminRecoveryCodesPanelProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [hasSavedCodes, setHasSavedCodes] = useState(false);

  async function handleCopyCodes() {
    const copied = await copyTextToClipboard(recoveryCodes.join("\n"));
    setCopyStatus(copied ? "Copied" : "Copy failed");
  }

  return (
    <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
        Emergency access
      </p>
      <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        {description}
      </p>

      <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-sm text-slate-200 sm:grid-cols-2">
        {recoveryCodes.map((recoveryCode) => (
          <code
            key={recoveryCode}
            className="rounded-lg bg-white/[0.035] px-3 py-2"
          >
            {recoveryCode}
          </code>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void handleCopyCodes()}
          className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04]"
        >
          {copyStatus ?? "Copy all codes"}
        </button>

        {requireAcknowledgement && (
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
            <input
              type="checkbox"
              checked={hasSavedCodes}
              onChange={(event) => setHasSavedCodes(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
            />
            I stored these codes somewhere safe.
          </label>
        )}
      </div>

      {onContinue && (
        <button
          type="button"
          disabled={
            isWorking || (requireAcknowledgement && !hasSavedCodes)
          }
          onClick={() => void onContinue()}
          className="mt-5 min-h-12 w-full rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isWorking ? "Finishing…" : continueLabel}
        </button>
      )}
    </section>
  );
}
