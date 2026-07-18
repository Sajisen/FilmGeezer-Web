import type {
  CSSProperties,
  ReactNode,
} from "react";

import ContentContainer from "./layout/ContentContainer";

interface PageBannerProps {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;

  /**
   * Controls the soft background crop on mobile.
   * Example: "74% center"
   */
  mobileAmbientPosition?: string;

  /**
   * Controls the width of the sharper mobile artwork.
   * Values above 100% make the original wide image larger
   * than the phone viewport.
   *
   * Recommended starting range: 220%–250%
   */
  mobileArtworkWidth?: string;

  /**
   * Moves the sharper mobile artwork horizontally.
   * Negative values move it farther toward the right.
   */
  mobileArtworkRight?: string;

  /**
   * Moves the sharper mobile artwork vertically.
   */
  mobileArtworkTop?: string;

  /**
   * Controls the standard desktop/tablet crop.
   * Example: "right center"
   */
  desktopImagePosition?: string;

  children?: ReactNode;
}

type BannerCssVariables = CSSProperties & {
  "--banner-mobile-ambient-position": string;
  "--banner-mobile-artwork-width": string;
  "--banner-mobile-artwork-right": string;
  "--banner-mobile-artwork-top": string;
  "--banner-desktop-position": string;
};

function PageBanner({
  eyebrow,
  title,
  description,
  imageUrl,
  mobileAmbientPosition = "74% center",
  mobileArtworkWidth = "240%",
  mobileArtworkRight = "-18%",
  mobileArtworkTop = "1rem",
  desktopImagePosition = "right center",
  children,
}: PageBannerProps) {
  const bannerVariables: BannerCssVariables = {
    "--banner-mobile-ambient-position":
      mobileAmbientPosition,
    "--banner-mobile-artwork-width":
      mobileArtworkWidth,
    "--banner-mobile-artwork-right":
      mobileArtworkRight,
    "--banner-mobile-artwork-top":
      mobileArtworkTop,
    "--banner-desktop-position":
      desktopImagePosition,
  };

  return (
    <section
      style={bannerVariables}
      className="
        relative isolate overflow-hidden
        border-b border-white/10
        bg-slate-950
      "
    >
      {/*
       * MOBILE AMBIENT LAYER
       *
       * Fills the complete banner.
       * It provides colour and atmosphere without needing
       * the important parts of the artwork to remain readable.
       */}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="
          pointer-events-none
          absolute inset-0 -z-30
          h-full w-full
          scale-105
          object-cover
          opacity-30
          blur-[2px]
          [object-position:var(--banner-mobile-ambient-position)]
          md:hidden
        "
      />

      {/*
       * MOBILE FOCAL ARTWORK
       *
       * Uses the same file, but displays a wider portion of
       * the right-side composition. This keeps the mascot and
       * Anime panel more recognisable.
       */}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="
          pointer-events-none
          absolute -z-20
          h-auto max-w-none
          opacity-75
          md:hidden

          top-[var(--banner-mobile-artwork-top)]
          right-[var(--banner-mobile-artwork-right)]
          w-[var(--banner-mobile-artwork-width)]
        "
      />

      {/*
       * TABLET AND DESKTOP IMAGE
       *
       * Preserves the current desktop layout that already
       * looks good.
       */}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="
          pointer-events-none
          absolute inset-0 -z-30
          hidden h-full w-full
          object-cover
          opacity-80
          md:block

          [object-position:var(--banner-desktop-position)]
        "
      />

      {/*
       * MOBILE VERTICAL SCRIM
       *
       * Protects the title, description and search component,
       * while keeping enough image brightness below them.
       */}
      <div
        className="
          absolute inset-0 -z-10
          bg-gradient-to-b
          from-slate-950/80
          via-slate-950/48
          to-slate-950/68
          md:hidden
        "
      />

      {/*
       * MOBILE HORIZONTAL SCRIM
       *
       * Darkens the text side more strongly than the far-right
       * side containing the Anime artwork.
       */}
      <div
        className="
          absolute inset-0 -z-10
          bg-gradient-to-r
          from-slate-950/80
          via-slate-950/42
          to-slate-950/10
          md:hidden
        "
      />

      {/*
       * TABLET AND DESKTOP SCRIM
       *
       * Keeps the desktop text readable without making the
       * right-side illustration unnecessarily dark.
       */}
      <div
        className="
          absolute inset-0 -z-10
          hidden
          bg-gradient-to-r
          from-slate-950
          via-slate-950/85
          to-slate-950/10
          md:block
        "
      />

      {/* Subtle bottom blend into the page background. */}
      <div
        className="
          absolute inset-0 -z-10
          bg-gradient-to-t
          from-slate-950/55
          via-transparent
          to-slate-950/10
        "
      />

      <div
        className="
          flex min-h-[560px] items-center
          py-10

          md:min-h-[500px]
          md:py-16

          lg:py-20
        "
      >
        <ContentContainer>
          <div className="relative z-10 max-w-3xl">
            <p
              className="
                text-xs font-semibold uppercase
                tracking-[0.32em]
                text-sky-300

                [text-shadow:0_2px_14px_rgba(2,6,23,0.95)]

                sm:text-sm
              "
            >
              {eyebrow}
            </p>

            <h1
              className="
                mt-4
                max-w-[18ch]
                text-[clamp(2.25rem,10vw,3rem)]
                font-bold
                leading-[1.05]
                tracking-tight
                text-white

                [text-shadow:0_3px_22px_rgba(2,6,23,1)]

                md:max-w-3xl
                md:text-5xl

                lg:text-6xl
              "
            >
              {title}
            </h1>

            <p
              className="
                mt-5
                max-w-2xl
                text-base
                leading-7
                text-slate-100/90

                [text-shadow:0_2px_16px_rgba(2,6,23,1)]

                sm:text-lg
              "
            >
              {description}
            </p>

            {children && (
              <div className="mt-6 md:mt-8">
                {children}
              </div>
            )}
          </div>
        </ContentContainer>
      </div>
    </section>
  );
}

export default PageBanner;