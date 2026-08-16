import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getGoogleClientId,
  initializeGoogleIdentityServices,
  setActiveGoogleCredentialHandler,
} from "../googleIdentity";

interface GoogleIdentityButtonProps {
  disabled?: boolean;
  onCredential: (credential: string) => void;
}

interface GoogleAvailabilityError {
  message: string;
  retryable: boolean;
}

function GoogleIdentityButton({
  disabled = false,
  onCredential,
}: GoogleIdentityButtonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);

  const [isReady, setIsReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [availabilityError, setAvailabilityError] =
    useState<GoogleAvailabilityError | null>(null);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    if (disabled) {
      host.setAttribute("inert", "");
      host.setAttribute("aria-disabled", "true");
    } else {
      host.removeAttribute("inert");
      host.removeAttribute("aria-disabled");
    }

    return () => {
      host.removeAttribute("inert");
      host.removeAttribute("aria-disabled");
    };
  }, [disabled]);

  const clientId = getGoogleClientId();

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let cancelled = false;
    let cleanupHandler = () => {};
    let resizeObserver: ResizeObserver | null = null;
    let lastRenderedWidth = 0;

    void initializeGoogleIdentityServices(clientId)
      .then((api) => {
        if (cancelled || !hostRef.current) {
          return;
        }

        cleanupHandler = setActiveGoogleCredentialHandler(
          (credential) => {
            onCredentialRef.current(credential);
          },
        );

        const render = () => {
          const host = hostRef.current;

          if (!host || cancelled) {
            return;
          }

          const measuredWidth = Math.floor(
            host.getBoundingClientRect().width,
          );

          const width = Math.max(
            120,
            Math.min(
              400,
              measuredWidth > 0 ? measuredWidth : 320,
            ),
          );

          if (width === lastRenderedWidth) {
            return;
          }

          lastRenderedWidth = width;
          host.replaceChildren();

          /*
           * FilmGeezer declares a dark color scheme globally. Google's
           * personalized button is rendered inside a cross-origin iframe,
           * and inheriting the dark scheme can make Chromium paint an
           * additional light iframe surface around Google's own outlined
           * button. Keep the GIS host/iframe explicitly light so the official
           * white button is the only white surface.
           */
          host.style.colorScheme = "light";

          api.accounts.id.renderButton(host, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width,
            locale: "en",
          });

          for (const iframe of host.querySelectorAll("iframe")) {
            iframe.style.colorScheme = "light";
          }

          setAvailabilityError(null);
          setIsReady(true);
        };

        render();

        resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(hostRef.current);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        hostRef.current?.replaceChildren();

        setAvailabilityError({
          message:
            "Google sign-in could not be loaded. Check your connection and try again.",
          retryable: true,
        });
      });

    return () => {
      cancelled = true;
      cleanupHandler();
      resizeObserver?.disconnect();
    };
  }, [clientId, loadAttempt]);

  if (!clientId) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-11 w-full items-center rounded-xl border border-amber-300/20 bg-amber-400/[0.07] px-3.5 py-2 text-xs leading-5 text-amber-100"
      >
        Google sign-in is unavailable right now. Please use another sign-in method or try again later.
      </div>
    );
  }

  if (availabilityError) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-400/[0.07] px-3.5 py-2 text-xs leading-5 text-amber-100"
      >
        <span>{availabilityError.message}</span>

        {availabilityError.retryable ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsReady(false);
              setAvailabilityError(null);
              setLoadAttempt(
                (currentAttempt) => currentAttempt + 1,
              );
            }}
            className="shrink-0 rounded-lg border border-amber-200/20 bg-amber-300/10 px-2.5 py-1.5 font-bold text-amber-50 transition hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto min-h-11 w-full max-w-[400px] bg-transparent"
      style={{ colorScheme: "light" }}
    >
      <div
        ref={hostRef}
        aria-hidden={!isReady}
        style={{ colorScheme: "light" }}
        className={
          disabled
            ? "pointer-events-none flex min-h-11 w-full justify-center bg-transparent opacity-50"
            : "flex min-h-11 w-full justify-center bg-transparent"
        }
      />

      {!isReady ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-xl border border-white/10 bg-white/[0.035] motion-reduce:animate-none"
        />
      ) : null}

      {disabled && isReady ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 cursor-wait"
        />
      ) : null}
    </div>
  );
}

export default GoogleIdentityButton;
