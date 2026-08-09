import LegalPageLayout, {
  LegalSection,
} from "../components/legal/LegalPageLayout";

function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy & data"
      title="Privacy Policy"
      intro="This policy explains what FilmGeezer stores, why it is used, and the choices available to you. It is written around the current FilmGeezer implementation rather than a generic tracking-heavy website template."
      updatedLabel="Last updated: August 9, 2026"
    >
      <LegalSection title="1. Information FilmGeezer may process">
        <p>
          If you create an account, FilmGeezer processes account information such
          as your email address, display name, verification state, account status,
          roles, and security-related timestamps. Passwords are not stored in
          plaintext; the server stores a password hash used to verify future sign-ins.
        </p>
        <p>
          FilmGeezer also processes feature data you choose to create, including
          Watchlist items, entertainment preferences, optional email preferences,
          notifications, support conversations, and profile-image information.
        </p>
      </LegalSection>

      <LegalSection title="2. Authentication and security information">
        <p>
          FilmGeezer uses server-side session records and necessary HttpOnly session
          cookies to keep signed-in users authenticated. Security records can also
          include verification/reset challenges, session history, security audit
          events, hashed IP-address information, and a shortened browser/device
          description used for account-security features.
        </p>
        <p>
          Administrator passkeys store the public credential information needed to
          verify WebAuthn authentication. Biometric data and passkey private keys do
          not enter FilmGeezer.
        </p>
      </LegalSection>

      <LegalSection title="3. Guest Watchlist and browser storage">
        <p>
          Guests can use a temporary Watchlist without creating an account. Those
          items are stored in your browser using local storage and are designed to
          expire after seven days. If you later sign in, eligible guest items can be
          merged into your account Watchlist.
        </p>
        <p>
          FilmGeezer does not currently use advertising cookies or third-party
          analytics trackers. If that changes, this policy and any consent controls
          will need to be reviewed before the new tracking is enabled.
        </p>
      </LegalSection>

      <LegalSection title="4. Profile images">
        <p>
          Uploaded profile images are validated and reprocessed before storage. The
          server strips image metadata and stores a processed WebP version rather
          than retaining the original upload. Production profile images are stored
          using FilmGeezer&apos;s object-storage provider.
        </p>
      </LegalSection>

      <LegalSection title="5. How FilmGeezer uses information">
        <p>
          Information is used to provide accounts, authentication, Watchlists,
          recommendations, preferences, notifications, support conversations,
          profile images, administrator security, and other features you request.
          Security and operational information is also used to prevent abuse,
          diagnose failures, protect sessions, and maintain the service.
        </p>
        <p>
          Optional recommendation/discovery and FilmGeezer product-update email
          preferences are stored separately. Those optional categories are off by
          default. Essential account, security, and support communications are not
          treated as optional marketing email.
        </p>
      </LegalSection>

      <LegalSection title="6. Service providers and external data sources">
        <p>
          FilmGeezer relies on service providers to operate the application. Current
          infrastructure includes Railway for application hosting and production
          object storage, MongoDB for application databases, Cloudflare for DNS and
          related edge infrastructure, Resend for automated transactional email, and
          Zoho Mail for the human support mailbox.
        </p>
        <p>
          Entertainment information is obtained or supplemented from third-party
          data sources including TMDB and, for selected anime character information,
          AniList. Streaming-provider availability displayed through TMDB is powered
          by JustWatch. When you follow an external link, that external service&apos;s
          own privacy practices apply.
        </p>
      </LegalSection>

      <LegalSection title="7. Sharing and sale of personal information">
        <p>
          FilmGeezer does not sell personal information. Information may be handled
          by the infrastructure and communication providers needed to operate the
          service, and may be disclosed when reasonably necessary to comply with law,
          protect users, investigate abuse, or protect FilmGeezer&apos;s systems and rights.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention and account deactivation">
        <p>
          Different records have different lifetimes. Temporary authentication
          challenges and sessions use feature-specific expiry or revocation rules,
          and the guest Watchlist is designed to expire after seven days. Replaced or
          removed profile images are deleted from active storage through the profile
          image lifecycle.
        </p>
        <p>
          Account deactivation signs the account out, revokes active sessions and
          challenges, and removes the active profile image when one exists. It is not
          currently presented as guaranteed immediate erasure of every historical
          record. Security, support, audit, preference-change, and email-delivery
          records may be retained where they remain useful for security, support,
          reliability, or record integrity.
        </p>
      </LegalSection>

      <LegalSection title="9. Your choices">
        <p>
          Signed-in users can manage Watchlists, entertainment preferences, optional
          email preferences, active sessions, profile images, and other account
          controls from FilmGeezer. You can also deactivate your account through the
          available account controls.
        </p>
        <p>
          For questions about access, correction, deletion, reactivation, or other
          privacy matters that are not available as a self-service control, contact
          FilmGeezer support. The available response can depend on the type of record
          and applicable law.
        </p>
      </LegalSection>

      <LegalSection title="10. Security">
        <p>
          FilmGeezer uses measures such as HTTPS in production, HttpOnly session
          cookies, CSRF and trusted-origin checks, rate limits, password hashing,
          server-side authorization, administrator MFA/passkeys, processed profile
          images, and restricted handling of secrets. No internet service can promise
          absolute security, so security controls are reviewed as the project evolves.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          This policy may be updated when FilmGeezer&apos;s features, providers, or data
          practices materially change. The updated date at the top of this page will
          be revised when that happens.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

export default PrivacyPage;
