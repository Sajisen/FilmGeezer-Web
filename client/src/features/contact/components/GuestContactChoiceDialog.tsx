import {
  useEffect,
  useRef,
} from "react";

interface GuestContactChoiceDialogProps {
  email: string;
  isSending: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSendAsGuest: () => void;
}

function GuestContactChoiceDialog({
  email,
  isSending,
  onClose,
  onSignIn,
  onSendAsGuest,
}: GuestContactChoiceDialogProps) {
  const signInButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    signInButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSending, onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/78 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSending) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-contact-dialog-title"
        aria-describedby="guest-contact-dialog-description"
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/12 bg-slate-900 shadow-2xl shadow-black/50"
      >
        <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.15),transparent_38%)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M12 13a4 4 0 100-8 4 4 0 000 8zM5.5 20a6.5 6.5 0 0113 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <button
              type="button"
              aria-label="Close"
              disabled={isSending}
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/7 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path
                  d="M7 7l10 10M17 7L7 17"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <h2
            id="guest-contact-dialog-title"
            className="mt-4 text-2xl font-black tracking-tight text-white"
          >
            Continue without an account?
          </h2>
          <p
            id="guest-contact-dialog-description"
            className="mt-2 text-sm leading-6 text-slate-400"
          >
            You can send this request as a guest, but it will not appear in
            FilmGeezer and you will not be able to continue the conversation
            here.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Guest follow-up email
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-200">
              {email}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Support will use this address for any later follow-up.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] px-4 py-3">
            <p className="text-sm font-bold text-sky-100">
              Signing in keeps the full experience
            </p>
            <p className="mt-1 text-xs leading-5 text-sky-100/70">
              Your draft stays here while you sign in. The request will then
              appear in Recent requests and you can reply inside FilmGeezer.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
            <button
              ref={signInButtonRef}
              type="button"
              disabled={isSending}
              onClick={onSignIn}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
            >
              Sign in or register
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={onSendAsGuest}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-bold text-slate-200 transition hover:bg-white/7 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
            >
              {isSending ? "Sending…" : "Send as guest"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default GuestContactChoiceDialog;
