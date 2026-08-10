import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";

import {
  ExternalNavigationContext,
  type ExternalNavigationRequest,
} from "./externalNavigationContext";

interface ExternalNavigationProviderProps {
  children: ReactNode;
}

interface ExternalNavigationNotice {
  destinationName: string;
  safeUrl: string | null;
  hostname: string;
}

function getExternalDestination(url: string) {
  try {
    const parsedUrl = new URL(url, window.location.href);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return {
        safeUrl: null,
        hostname: "Unsupported link",
      };
    }

    return {
      safeUrl: parsedUrl.href,
      hostname: parsedUrl.hostname.replace(/^www\./, ""),
    };
  } catch {
    return {
      safeUrl: null,
      hostname: "Invalid link",
    };
  }
}

export function ExternalNavigationProvider({
  children,
}: ExternalNavigationProviderProps) {
  const [notice, setNotice] = useState<ExternalNavigationNotice | null>(null);

  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const requestExternalNavigation = useCallback(
    ({ url, destinationName }: ExternalNavigationRequest) => {
      const destination = getExternalDestination(url);

      setNotice({
        destinationName,
        safeUrl: destination.safeUrl,
        hostname: destination.hostname,
      });
    },
    [],
  );

  const closeNotice = useCallback(() => {
    setNotice(null);
  }, []);

  useModalAccessibility({
    isOpen: notice !== null,
    dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: closeNotice,
  });

  const contextValue = useMemo(
    () => ({
      requestExternalNavigation,
    }),
    [requestExternalNavigation],
  );

  return (
    <ExternalNavigationContext.Provider value={contextValue}>
      {children}

      {notice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel external navigation"
            tabIndex={-1}
            onClick={closeNotice}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-navigation-title"
            aria-describedby="external-navigation-message"
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/50 sm:p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Leaving FilmGeezer
            </p>

            <h2
              id="external-navigation-title"
              className="mt-3 text-2xl font-bold text-white"
            >
              Open {notice.destinationName}?
            </h2>

            <p
              id="external-navigation-message"
              className="mt-3 leading-7 text-slate-300"
            >
              This link opens an external website in a new tab. It is not
              operated by FilmGeezer.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Destination
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-slate-200">
                {notice.hostname}
              </p>
            </div>

            {!notice.safeUrl && (
              <p role="alert" className="mt-4 text-sm leading-6 text-red-200">
                FilmGeezer could not verify this link, so it cannot be opened.
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={closeNotice}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 font-semibold text-white transition hover:border-sky-300/50 hover:bg-white/[0.06]"
              >
                Stay here
              </button>

              {notice.safeUrl && (
                <a
                  href={notice.safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeNotice}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-5 font-semibold text-white transition hover:bg-sky-400"
                >
                  Continue
                  <span aria-hidden="true" className="ml-2">
                    ↗
                  </span>
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </ExternalNavigationContext.Provider>
  );
}