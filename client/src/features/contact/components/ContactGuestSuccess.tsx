import { useState } from "react";

import type {
  ContactSubmissionResponse,
} from "../../../types/contact";

interface ContactGuestSuccessProps {
  submission: ContactSubmissionResponse;
  onStartAnother: () => void;
}

function ContactGuestSuccess({
  submission,
  onStartAnother,
}: ContactGuestSuccessProps) {
  const [referenceCopied, setReferenceCopied] = useState(false);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(submission.referenceId);
      setReferenceCopied(true);
    } catch {
      setReferenceCopied(false);
    }
  }

  return (
    <div
      role="status"
      className="flex min-h-[32rem] flex-col items-center justify-center px-5 py-10 text-center sm:px-8"
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-8 w-8"
        >
          <path
            d="M5 12.5l4.25 4.25L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <h2 className="mt-5 text-2xl font-black tracking-tight">
        Message received
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
        Keep the reference number below. Because this was sent as a guest, it
        will not appear in FilmGeezer and any support follow-up must use the
        email address you submitted.
      </p>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Request reference
        </p>
        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <code className="break-all text-base font-black text-sky-200">
            {submission.referenceId}
          </code>
          <button
            type="button"
            onClick={() => void copyReference()}
            className="min-h-9 whitespace-nowrap rounded-full border border-white/10 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/7 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            {referenceCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartAnother}
        className="mt-7 min-h-11 rounded-full bg-sky-500 px-6 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        Send another message
      </button>
    </div>
  );
}

export default ContactGuestSuccess;
