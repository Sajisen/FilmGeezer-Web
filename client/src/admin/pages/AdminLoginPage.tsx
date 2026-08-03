import {
  useState,
  type FormEvent,
} from "react";

import { getPublicAppOrigin } from "../adminRuntime";
import { useAdminAuth } from "../auth/adminAuthContext";

function AdminShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path
        d="M12 3.2l7 2.7v5.3c0 4.5-2.8 7.9-7 9.6-4.2-1.7-7-5.1-7-9.6V5.9l7-2.7z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 11.8l1.7 1.7 3.7-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminLoginPage() {
  const { signIn, errorMessage: bootstrapError } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn({ email, password });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Administrator sign-in could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_82%_86%,rgba(59,130,246,0.09),transparent_30%)]" />

      <div className="relative w-full max-w-md">
        <a
          href={getPublicAppOrigin()}
          className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          FilmGeezer public site
        </a>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 shadow-2xl shadow-black/35 backdrop-blur-xl">
          <div className="border-b border-white/8 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
                <AdminShieldIcon />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
                  FilmGeezer administration
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
                  Administrator sign-in
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Use a verified FilmGeezer account that has been granted the
              administrator role. Public sessions do not unlock this area.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8 sm:py-7">
            {(errorMessage || bootstrapError) && (
              <p
                role="alert"
                className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-100"
              >
                {errorMessage ?? bootstrapError}
              </p>
            )}

            <label className="block">
              <span className="text-sm font-bold text-slate-200">Email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15"
                placeholder="administrator@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-200">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15"
                placeholder="Enter your FilmGeezer password"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 w-full rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting ? "Checking access…" : "Open administration"}
            </button>

            <p className="text-xs leading-5 text-slate-500">
              Administrator sessions are separate from the public site, expire
              after eight hours, and close after thirty minutes of inactivity.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}