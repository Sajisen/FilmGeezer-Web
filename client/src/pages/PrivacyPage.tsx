import LegalPageLayout, {
  LegalSection,
} from "../components/legal/LegalPageLayout";

const PRIVACY_SUMMARY = [
  "FilmGeezer does not sell your personal information.",
  "We use the information you provide to run your account, Watchlist, recommendations, support, and security features.",
  "Optional recommendation and product-update emails are off by default, and FilmGeezer does not currently use advertising cookies or third-party analytics trackers.",
] as const;

function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy & data"
      title="Privacy Policy"
      intro="This page explains, in plain language, what FilmGeezer stores, why it is needed, and the controls available to you."
      updatedLabel="Last updated: August 16, 2026"
      summary={PRIVACY_SUMMARY}
    >
      <LegalSection title="1. Information connected to your account">
        <p>
          If you create an account, FilmGeezer stores information such as your
          email address, display name, verification status, account status,
          role, and information needed to keep the account secure.
        </p>
        <p>
          If you set a FilmGeezer password, it is never stored as readable
          text. FilmGeezer stores a secure password hash that is used to check
          future password sign-ins.
        </p>
        <p>
          If you choose Continue with Google, FilmGeezer receives the Google
          account identifier, verified email address, and basic profile name
          that Google provides for sign-in. FilmGeezer does not receive your
          Google password.
        </p>
        <p>
          We also store information you create while using features such as
          your Watchlist, entertainment preferences, email preferences,
          notifications, support conversations, and profile image.
        </p>
      </LegalSection>

      <LegalSection title="2. Sign-in and account security">
        <p>
          FilmGeezer uses secure server-side sessions and necessary cookies to
          keep you signed in. We also keep limited security records that help
          us verify account actions, manage active sessions, prevent abuse, and
          investigate account problems.
        </p>
        <p>
          Continue with Google uses Google Identity Services to confirm the
          Google account you select. After that confirmation, FilmGeezer uses
          its own account and session system. A connected Google account can
          also be used to confirm sensitive account changes.
        </p>
        <p>
          Administrator passkeys work through WebAuthn. FilmGeezer stores the
          public credential information needed to verify a passkey. Your
          biometric information and passkey private key stay with your device
          or passkey provider and are not sent to FilmGeezer.
        </p>
      </LegalSection>

      <LegalSection title="3. Guest Watchlist and browser storage">
        <p>
          You can use a temporary Watchlist without creating an account. Guest
          Watchlist items are stored in your browser and are designed to expire
          after seven days. If you later sign in, eligible guest items can be
          merged into your account Watchlist.
        </p>
        <p>
          FilmGeezer does not currently use advertising cookies or third-party
          analytics trackers. If that changes in the future, this policy and
          any required consent controls will be reviewed before the new
          tracking is enabled.
        </p>
      </LegalSection>

      <LegalSection title="4. Profile images">
        <p>
          When you upload a profile image, FilmGeezer checks and reprocesses it
          before storage. Image metadata is removed and a processed WebP image
          is stored instead of keeping the original upload.
        </p>
      </LegalSection>

      <LegalSection title="5. Why FilmGeezer uses this information">
        <p>
          We use information to provide the features you ask for: accounts,
          sign-in, Watchlists, recommendations, preferences, notifications,
          support conversations, profile images, and account security.
        </p>
        <p>
          Some information is also used to protect FilmGeezer, prevent abuse,
          diagnose failures, and keep the service reliable.
        </p>
        <p>
          Optional recommendation/discovery and FilmGeezer product-update
          emails are controlled separately and are off by default. Essential
          account, security, and support emails cannot be turned off as
          marketing preferences because they are needed to operate or protect
          your account.
        </p>
      </LegalSection>

      <LegalSection title="6. Services FilmGeezer relies on">
        <p>
          FilmGeezer uses third-party services to operate the application.
          These currently include Railway for hosting and production object
          storage, MongoDB for databases, Cloudflare for DNS and related edge
          infrastructure, Resend for automated account emails, Zoho Mail for
          the human support mailbox, and Google Identity Services when you
          choose Google as a sign-in method.
        </p>
        <p>
          Entertainment information comes from or may be supplemented by
          services such as TMDB and AniList. Streaming-provider availability
          shown through TMDB is powered by JustWatch. If you open an external
          website or service, that service&apos;s own privacy rules apply.
        </p>
      </LegalSection>

      <LegalSection title="7. Sharing and selling information">
        <p>
          FilmGeezer does not sell your personal information.
        </p>
        <p>
          Information may be processed by the service providers needed to run
          FilmGeezer. It may also be disclosed when reasonably necessary to
          comply with law, investigate abuse, protect users, or protect
          FilmGeezer&apos;s systems and rights.
        </p>
      </LegalSection>

      <LegalSection title="8. How long information is kept">
        <p>
          Different information is kept for different lengths of time.
          Temporary verification and recovery information expires according to
          the feature that created it. Sessions can expire or be revoked, and
          the guest Watchlist is designed to expire after seven days.
        </p>
        <p>
          Replaced or removed profile images are removed through the profile
          image lifecycle.
        </p>
        <p>
          Deactivating an account signs it out, revokes active sessions and
          account challenges, and removes the active profile image when one
          exists. Deactivation does not currently mean that every historical
          record is erased immediately. Some security, support, audit,
          preference-change, and email-delivery records may remain when they
          are still needed for security, support, reliability, or maintaining
          an accurate history of important actions.
        </p>
      </LegalSection>

      <LegalSection title="9. Your controls">
        <p>
          Signed-in users can manage their Watchlist, entertainment
          preferences, optional email preferences, active sessions, profile
          image, and other available account controls from FilmGeezer. You can
          also deactivate your account from the account area.
        </p>
        <p>
          If you need help with access, correction, deletion, reactivation, or
          another privacy question that is not available as a self-service
          control, contact FilmGeezer Support.
        </p>
      </LegalSection>

      <LegalSection title="10. How FilmGeezer protects accounts">
        <p>
          FilmGeezer uses safeguards such as HTTPS in production, HttpOnly
          session cookies, CSRF and trusted-origin checks, rate limits,
          password hashing, server-side authorization, administrator MFA and
          passkeys, processed profile images, and restricted handling of
          secrets.
        </p>
        <p>
          No internet service can promise perfect security, so these controls
          are reviewed and improved as FilmGeezer develops.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          This policy may be updated when FilmGeezer&apos;s features, providers,
          or data practices meaningfully change. The date at the top of the
          page will be updated when that happens.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

export default PrivacyPage;
