import type {
  AuthVerificationReceipt,
} from "../../../types/auth";

interface RegistrationPendingFormProps {
  verification: AuthVerificationReceipt | null;
  email: string | null;
  onEnterVerificationCode: () => void;
  onSwitchToLogin: () => void;
  onSwitchToRegistration: () => void;
}

function MailCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
    >
      <path
        d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m4.5 7.25 6.14 4.42a2.3 2.3 0 0 0 2.72 0l6.14-4.42"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m15.75 16.1 1.15 1.15 2.35-2.55"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RegistrationPendingForm({
  verification,
  email,
  onEnterVerificationCode,
  onSwitchToLogin,
  onSwitchToRegistration,
}: RegistrationPendingFormProps) {
  const canEnterCode =
    verification !== null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.07] p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
            <MailCheckIcon />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">
              Check your inbox
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-300">
              FilmGeezer sent the next step
              {email ? (
                <>
                  {" "}to{" "}
                  <strong className="break-all font-semibold text-white">
                    {email}
                  </strong>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={
            onEnterVerificationCode
          }
          disabled={!canEnterCode}
          className="min-h-12 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/20 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          Enter verification code
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/25 hover:bg-sky-400/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Sign in
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-white/8 bg-slate-950/35 p-4 text-sm leading-6 text-slate-400">
        <p>
          <span className="font-semibold text-slate-200">
            Creating a new account?
          </span>{" "}
          Use the six-digit code in the email.
        </p>

        <p>
          <span className="font-semibold text-slate-200">
            Already registered?
          </span>{" "}
          Choose Sign in and use your existing password.
        </p>
      </div>

      <p className="text-center text-sm leading-6 text-slate-500">
        Used the wrong email?{" "}
        <button
          type="button"
          onClick={
            onSwitchToRegistration
          }
          className="font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Start again
        </button>
      </p>
    </div>
  );
}

export default RegistrationPendingForm;
