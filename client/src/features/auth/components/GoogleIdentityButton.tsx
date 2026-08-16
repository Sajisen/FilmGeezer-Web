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
  onUnavailable?: (message: string) => void;
}

function GoogleIdentityButton({
  disabled = false,
  onCredential,
  onUnavailable,
}: GoogleIdentityButtonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const onUnavailableRef = useRef(onUnavailable);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

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

  useEffect(() => {
    const clientId = getGoogleClientId();

    if (!clientId) {
      onUnavailableRef.current?.(
        "Google sign in is temporarily unavailable. Please try again shortly.",
      );
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
          api.accounts.id.renderButton(host, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width,
          });
          setIsReady(true);
        };

        render();

        resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(hostRef.current);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        onUnavailableRef.current?.(
          error instanceof Error
            ? error.message
            : "Google sign in could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
      cleanupHandler();
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-11 w-full overflow-hidden rounded-md">
      <div
        ref={hostRef}
        aria-hidden={!isReady}
        className={
          disabled
            ? "pointer-events-none flex min-h-11 w-full justify-center opacity-50"
            : "flex min-h-11 w-full justify-center"
        }
      />

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
