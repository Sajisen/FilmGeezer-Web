import LegalPageLayout, {
  LegalSection,
} from "../components/legal/LegalPageLayout";

const TERMS_SUMMARY = [
  "Use your own account and do not try to bypass FilmGeezer security or interfere with other users.",
  "FilmGeezer helps you discover entertainment, but third-party data, provider availability, and external links can change.",
  "FilmGeezer may update features or these terms as the service develops, while preserving rights that cannot legally be excluded.",
] as const;

function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Using FilmGeezer"
      title="Terms of Use"
      intro="These terms explain the basic rules for using FilmGeezer and what you can expect from the service."
      updatedLabel="Last updated: August 9, 2026"
      summary={TERMS_SUMMARY}
    >
      <LegalSection title="1. What FilmGeezer provides">
        <p>
          FilmGeezer is an entertainment discovery service for movies, TV
          series, anime, and K-dramas. Depending on the title and feature, it
          can show information such as recommendations, Watchlists, trailers,
          episodes, provider availability, and FilmGeezer content links.
        </p>
        <p>
          Entertainment information changes over time, so FilmGeezer cannot
          guarantee that every title, link, trailer, provider listing, episode
          detail, or third-party data item will always be available, complete,
          current, or error-free.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          Use accurate account information and protect access to your email
          address and authentication methods. Use only accounts you are
          authorized to access.
        </p>
        <p>
          Do not share passwords, verification codes, recovery information,
          session information, or administrator credentials.
        </p>
        <p>
          FilmGeezer may suspend or restrict access when reasonably necessary
          to protect users, the service, administrator security, or the
          integrity of FilmGeezer&apos;s systems.
        </p>
      </LegalSection>

      <LegalSection title="3. Use FilmGeezer fairly and safely">
        <p>
          Do not try to bypass authentication or authorization, abuse rate
          limits, interfere with other users, probe private administrator
          features, upload malicious material, or deliberately disrupt the
          service.
        </p>
        <p>
          Do not impersonate another person or try to obtain another
          user&apos;s password, session, verification code, passkey information,
          or recovery method.
        </p>
      </LegalSection>

      <LegalSection title="4. Information and files you provide">
        <p>
          If you upload a profile image, send a support message, save
          preferences, or provide other account information, make sure you are
          allowed to provide it and that it does not violate the law or
          another person&apos;s rights.
        </p>
        <p>
          FilmGeezer may process and store that information as reasonably
          needed to provide, secure, support, and maintain the related feature.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-party services and content">
        <p>
          FilmGeezer uses third-party entertainment information and may link to
          external websites, streaming/provider pages, Telegram destinations,
          or other services. Those services are separate from FilmGeezer and
          may have their own terms, availability, regional restrictions, and
          privacy rules.
        </p>
        <p>
          Showing or linking to a movie, show, image, trailer, provider brand,
          or other third-party material does not give FilmGeezer or its users
          ownership of that material.
        </p>
      </LegalSection>

      <LegalSection title="6. Data sources and credits">
        <p>
          FilmGeezer uses TMDB data and images and provides TMDB attribution in
          the About section. Streaming-provider availability supplied through
          TMDB is powered by JustWatch and is attributed to JustWatch.
          Selected anime character information may also be supplemented by
          AniList.
        </p>
      </LegalSection>

      <LegalSection title="7. Service availability and changes">
        <p>
          FilmGeezer is actively developed. Features may be added, redesigned,
          limited, replaced, or removed. Maintenance and outages affecting
          FilmGeezer or a third-party service can also temporarily interrupt
          availability.
        </p>
      </LegalSection>

      <LegalSection title="8. External links and availability">
        <p>
          Provider catalogs, regions, external accounts, and third-party
          services can change independently from FilmGeezer. FilmGeezer is a
          discovery and navigation service, not a guarantee that an external
          service will provide a particular title or link at a particular
          time.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsibility and legal rights">
        <p>
          FilmGeezer is provided on an as-available basis. To the extent
          allowed by applicable law, FilmGeezer cannot promise uninterrupted
          operation or perfect third-party data.
        </p>
        <p>
          Nothing in these terms is intended to remove a consumer or other
          legal right that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to these terms">
        <p>
          These terms may be updated when FilmGeezer&apos;s service, security
          model, or operating practices meaningfully change. The date at the
          top of the page will be updated when that happens.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

export default TermsPage;
