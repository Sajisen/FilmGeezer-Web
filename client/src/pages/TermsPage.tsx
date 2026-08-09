import LegalPageLayout, {
  LegalSection,
} from "../components/legal/LegalPageLayout";

function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Using FilmGeezer"
      title="Terms of Use"
      intro="These terms describe the basic rules for using FilmGeezer. They are intentionally written for the current entertainment-discovery service and do not invent commercial terms that FilmGeezer does not currently offer."
      updatedLabel="Last updated: August 9, 2026"
    >
      <LegalSection title="1. The FilmGeezer service">
        <p>
          FilmGeezer is an entertainment discovery service for movies, TV series,
          anime, and K-dramas. It can provide title information, recommendations,
          Watchlists, trailers, episode information, provider availability, and links
          configured for FilmGeezer content.
        </p>
        <p>
          FilmGeezer does not guarantee that every title, external link, trailer,
          provider listing, episode detail, or third-party data item will always be
          available, complete, current, or error-free.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <p>
          You are responsible for providing accurate account information, keeping
          access to your email account and authentication factors secure, and using
          FilmGeezer only through your own authorized account. Do not share security
          codes, recovery material, session information, or administrator credentials.
        </p>
        <p>
          FilmGeezer may suspend, restrict, or deactivate access where reasonably
          necessary to protect the service, other users, administrator security, or
          the integrity of FilmGeezer&apos;s systems.
        </p>
      </LegalSection>

      <LegalSection title="3. Acceptable use">
        <p>
          Do not attempt to bypass authentication or authorization, abuse rate limits,
          interfere with other users, probe private administrator functionality,
          upload malicious content, scrape the service in a way that harms its
          operation, or use FilmGeezer to distribute unlawful or harmful material.
        </p>
        <p>
          You must not impersonate another person or attempt to obtain another user&apos;s
          password, session, verification code, passkey material, or recovery factor.
        </p>
      </LegalSection>

      <LegalSection title="4. User-provided material">
        <p>
          When you provide profile images, support messages, preference choices, or
          other account inputs, you are responsible for ensuring you are allowed to
          provide that material and that it does not violate applicable law or the
          rights of others.
        </p>
        <p>
          FilmGeezer may process and store those inputs only as reasonably necessary
          to provide, secure, support, and maintain the corresponding feature.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-party information and services">
        <p>
          FilmGeezer uses third-party entertainment data and may link to external
          websites, streaming/provider pages, Telegram destinations, or other
          services. Those services are independent from FilmGeezer and can have their
          own terms, availability, regional restrictions, privacy practices, and
          content policies.
        </p>
        <p>
          FilmGeezer does not grant rights to third-party movies, shows, artwork,
          trailers, provider brands, or other third-party material simply because it
          is displayed or referenced through the service.
        </p>
      </LegalSection>

      <LegalSection title="6. TMDB, JustWatch, and other data sources">
        <p>
          FilmGeezer uses TMDB data and images and displays the required TMDB
          attribution in the About section. Provider-availability information made
          available through TMDB is powered by JustWatch and is attributed to
          JustWatch. Selected anime character information may also be supplemented
          from AniList.
        </p>
      </LegalSection>

      <LegalSection title="7. Availability and changes">
        <p>
          FilmGeezer is an actively developed service. Features can be added,
          redesigned, limited, replaced, or removed, and maintenance or third-party
          outages can temporarily interrupt availability. Reasonable care is taken to
          protect important account and security behavior when changes are made.
        </p>
      </LegalSection>

      <LegalSection title="8. No guarantee of external content availability">
        <p>
          Availability information and external links can become stale because
          catalogs, regions, providers, external accounts, or third-party services
          change independently. FilmGeezer should be treated as a discovery and
          navigation aid, not as a guarantee that an external service will provide a
          particular title or link at a particular time.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsibility and legal rights">
        <p>
          FilmGeezer is provided on an as-available basis. To the extent permitted by
          applicable law, FilmGeezer cannot promise uninterrupted availability or
          perfect third-party data. Nothing in these terms is intended to remove any
          consumer or other legal right that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to these terms">
        <p>
          These terms may be updated when FilmGeezer&apos;s service, security model, or
          operating practices materially change. Continued use after an updated
          version becomes effective is subject to the updated terms where permitted
          by applicable law.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

export default TermsPage;
