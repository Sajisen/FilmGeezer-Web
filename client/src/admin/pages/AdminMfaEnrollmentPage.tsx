import { getPublicAppOrigin } from "../adminRuntime";
import { useAdminAuth } from "../auth/adminAuthContext";
import AdminMfaSetupFlow from "../security/AdminMfaSetupFlow";

export default function AdminMfaEnrollmentPage() {
  const { csrfToken, refreshSession, signOut } = useAdminAuth();

  if (!csrfToken) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_85%_86%,rgba(59,130,246,0.08),transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={getPublicAppOrigin()}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            FilmGeezer public site
          </a>
          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-10 rounded-full border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
          >
            Sign out
          </button>
        </div>

        <header className="py-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
            Required security step
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Set up administrator MFA
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Your password was verified, but this restricted session cannot open the dashboard until an authenticator factor is enrolled.
          </p>
        </header>

        <AdminMfaSetupFlow
          csrfToken={csrfToken}
          requirePassword={false}
          onComplete={async () => {
            await refreshSession();
          }}
        />
      </div>
    </main>
  );
}
