import { useState } from "react";

import { getPublicAppOrigin } from "../adminRuntime";
import { useAdminAuth } from "../auth/adminAuthContext";
import AdminMfaSetupFlow from "../security/AdminMfaSetupFlow";
import AdminPasskeySetupFlow from "../security/AdminPasskeySetupFlow";
import { supportsAdminPasskeys } from "../security/adminPasskeyBrowser";

type EnrollmentMethod = "passkey" | "totp";

function MethodCard({
  active,
  eyebrow,
  title,
  description,
  disabled = false,
  onClick,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? "border-sky-300/35 bg-sky-400/[0.08] shadow-lg shadow-sky-950/20"
          : "border-white/10 bg-slate-900/55 hover:border-white/20 hover:bg-slate-900/75"
      }`}
    >
      <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
        {eyebrow}
      </span>
      <span className="mt-2 block text-base font-black text-white">
        {title}
      </span>
      <span className="mt-2 block text-xs leading-5 text-slate-500">
        {description}
      </span>
    </button>
  );
}

export default function AdminMfaEnrollmentPage() {
  const {
    csrfToken,
    security,
    refreshSession,
    signOut,
  } = useAdminAuth();
  const passkeyAvailable = Boolean(
    security?.passkeysConfigured && supportsAdminPasskeys(),
  );
  const [method, setMethod] = useState<EnrollmentMethod>(
    passkeyAvailable ? "passkey" : "totp",
  );

  if (!csrfToken) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_85%_86%,rgba(59,130,246,0.08),transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-4xl">
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
            Protect administrator access
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
            Your password was verified, but this restricted session cannot open
            the dashboard until one strong administrator verification method is
            enrolled. Passkeys are preferred; an authenticator app remains a
            fully supported alternative.
          </p>
        </header>

        <section
          aria-label="Choose an administrator verification method"
          className="mb-6 grid gap-3 sm:grid-cols-2"
        >
          <MethodCard
            active={method === "passkey"}
            eyebrow="Recommended"
            title="Set up a passkey"
            description="Use Windows Hello, your phone, or a security key. User verification is required by the server."
            disabled={!passkeyAvailable}
            onClick={() => setMethod("passkey")}
          />
          <MethodCard
            active={method === "totp"}
            eyebrow="Alternative"
            title="Use an authenticator app"
            description="Scan a QR code and enter the rotating six-digit code from a TOTP-compatible app."
            onClick={() => setMethod("totp")}
          />
        </section>

        {!passkeyAvailable && security?.passkeysConfigured && (
          <p className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
            Passkeys are configured on the FilmGeezer server, but this browser
            does not report WebAuthn support. The authenticator-app method is
            available below.
          </p>
        )}

        {method === "passkey" && passkeyAvailable ? (
          <AdminPasskeySetupFlow
            csrfToken={csrfToken}
            title="Create your first administrator passkey"
            submitLabel="Set up passkey"
            onComplete={async () => {
              await refreshSession();
            }}
          />
        ) : (
          <AdminMfaSetupFlow
            csrfToken={csrfToken}
            requirePassword={false}
            onComplete={async () => {
              await refreshSession();
            }}
          />
        )}
      </div>
    </main>
  );
}
