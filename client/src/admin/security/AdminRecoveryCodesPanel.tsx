import {
  useEffect,
  useRef,
  useState,
} from "react";

import { copyTextToClipboard } from "../../utils/copyTextToClipboard";

interface AdminRecoveryCodesPanelProps {
  recoveryCodes: string[];
  title?: string;
  description?: string;
  requireAcknowledgement?: boolean;
  continueLabel?: string;
  isWorking?: boolean;
  focusHeadingOnMount?: boolean;
  onContinue?: () => Promise<void>;
}

export default function AdminRecoveryCodesPanel({
  recoveryCodes,
  title = "Save your recovery codes now",
  description = "Each code works once. FilmGeezer will not show this set again. Store the codes outside this browser and away from the device that holds your primary verification method.",
  requireAcknowledgement = false,
  continueLabel = "Continue",
  isWorking = false,
  focusHeadingOnMount = true,
  onContinue,
}: AdminRecoveryCodesPanelProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [hasSavedCodes, setHasSavedCodes] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focusHeadingOnMount) {
      return;
    }

    headingRef.current?.focus();
  }, [focusHeadingOnMount]);

  async function handleCopyCodes() {
    const copied = await copyTextToClipboard(recoveryCodes.join("\n"));
    setCopyStatus(copied ? "Recovery codes copied." : "Copy failed. Select and save the codes manually.");
  }

  return (
    <section
      aria-labelledby="admin-recovery-codes-title"
      aria-busy={isWorking}
      className="rounded-[1.75rem] border border-emerald-300/15 bg-emerald-400/[0.05] p-5 shadow-xl shadow-black/[0.08] sm:p-6"
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
        Emergency access
      </p>
      <h2
        ref={headingRef}
        id="admin-recovery-codes-title"
        tabIndex={-1}
        className="mt-2 text-xl font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        {description}
      </p>

      <ul className="mt-5 grid gap-2 rounded-2xl border border-white/[0.08] bg-slate-950/45 p-4 font-mono text-sm text-slate-200 sm:grid-cols-2">
        {recoveryCodes.map((recoveryCode) => (
          <li
            key={recoveryCode}
            className="rounded-lg bg-white/[0.035] px-3 py-2"
          >
            <code>{recoveryCode}</code>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleCopyCodes()}
            className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Copy all codes
          </button>

          <span
            role="status"
            aria-live="polite"
            className="text-xs font-semibold text-slate-400"
          >
            {copyStatus}
          </span>
        </div>

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
          className="mt-5 min-h-12 w-full rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isWorking ? "Finishing…" : continueLabel}
        </button>
      )}
    </section>
  );
}
