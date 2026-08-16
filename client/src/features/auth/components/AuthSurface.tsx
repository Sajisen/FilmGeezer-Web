import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CloseIcon,
} from "../../../components/navigation/NavigationIcons";

import {
  useModalAccessibility,
} from "../../../hooks/useModalAccessibility";

import {
  dismissActiveBrowserInput,
} from "../../../utils/browserInput";

interface AuthSurfaceProps {
  isModal: boolean;
  isBusy: boolean;
  allowAmbientDismiss: boolean;
  eyebrow: string;
  title: string;
  description: string;
  sideTitle: string;
  sideDescription: string;
  children: ReactNode;
  onClose: () => void;
}

function AuthSurface({
  isModal,
  isBusy,
  allowAmbientDismiss,
  eyebrow,
  title,
  description,
  sideTitle,
  sideDescription,
  children,
  onClose,
}: AuthSurfaceProps) {
  const dialogRef =
    useRef<HTMLElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const closeAttentionTimerRef =
    useRef<number | null>(null);

  const closeAttentionAnimationRef =
    useRef<Animation | null>(null);

  const isBusyRef =
    useRef(isBusy);

  const allowAmbientDismissRef =
    useRef(allowAmbientDismiss);

  const onCloseRef =
    useRef(onClose);

  const [showCloseAttention, setShowCloseAttention] =
    useState(false);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    allowAmbientDismissRef.current =
      allowAmbientDismiss;
  }, [allowAmbientDismiss]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const drawAttentionToCloseButton =
    useCallback(() => {
      if (
        closeAttentionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          closeAttentionTimerRef.current,
        );
      }

      closeAttentionAnimationRef.current
        ?.cancel();

      const closeButton =
        closeButtonRef.current;

      setShowCloseAttention(true);

      closeButton?.focus({
        preventScroll: true,
      });

      const prefersReducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

      if (
        closeButton &&
        !prefersReducedMotion
      ) {
        /*
         * Web Animations lets every blocked backdrop/Escape attempt
         * restart immediately. This feels responsive even when a user
         * clicks several times, unlike a long CSS pulse that can appear
         * delayed or fail to retrigger.
         */
        closeAttentionAnimationRef.current =
          closeButton.animate(
            [
              {
                transform:
                  "scale(1) rotate(0deg)",
              },
              {
                transform:
                  "scale(1.12) rotate(-7deg)",
                offset: 0.22,
              },
              {
                transform:
                  "scale(1.08) rotate(6deg)",
                offset: 0.45,
              },
              {
                transform:
                  "scale(1.05) rotate(-3deg)",
                offset: 0.68,
              },
              {
                transform:
                  "scale(1) rotate(0deg)",
              },
            ],
            {
              duration: 440,
              easing:
                "cubic-bezier(0.2, 0.9, 0.25, 1)",
            },
          );
      }

      closeAttentionTimerRef.current =
        window.setTimeout(
          () => {
            setShowCloseAttention(false);
            closeAttentionTimerRef.current =
              null;
          },
          620,
        );
    }, []);

  const requestAmbientDismiss =
    useCallback(() => {
      if (
        isBusyRef.current ||
        !allowAmbientDismissRef.current
      ) {
        drawAttentionToCloseButton();
        return;
      }

      onCloseRef.current();
    }, [drawAttentionToCloseButton]);

  useModalAccessibility({
    isOpen: isModal,
    dialogRef,
    initialFocusSelector: "[autofocus]",
    onEscape: requestAmbientDismiss,
  });

  useEffect(() => {
    if (isModal) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const autofocusElement = dialogRef.current?.querySelector<HTMLElement>(
        "[autofocus]",
      );

      (autofocusElement ?? closeButtonRef.current)?.focus({
        preventScroll: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
    };
  }, [isModal]);

  useEffect(() => {
    return () => {
      if (closeAttentionTimerRef.current !== null) {
        window.clearTimeout(closeAttentionTimerRef.current);
      }

      closeAttentionAnimationRef.current?.cancel();
      dismissActiveBrowserInput();
    };
  }, []);

  const surface = (
    <div
      className={
        isModal
          ? "fixed inset-0 z-[120] flex items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-5"
          : "flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_34%)] bg-slate-950 p-2 sm:p-4 lg:p-5"
      }
    >
      {isModal && (
        <button
          type="button"
          aria-label="Close authentication"
          tabIndex={-1}
          onClick={requestAmbientDismiss}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm sm:bg-slate-950/[0.82] sm:backdrop-blur-md"
        />
      )}

      <section
        ref={dialogRef}
        role={
          isModal
            ? "dialog"
            : "region"
        }
        aria-modal={
          isModal
            ? true
            : undefined
        }
        aria-labelledby="filmgeezer-auth-title"
        aria-describedby="filmgeezer-auth-description"
        aria-busy={isBusy || undefined}
        tabIndex={-1}
        className="relative z-10 grid max-h-[calc(100dvh-1rem)] w-full max-w-[28rem] min-h-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900 shadow-2xl shadow-black/70 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.75rem] lg:max-w-[56rem] lg:grid-cols-[0.82fr_1.18fr]"
      >
        <div className="relative hidden min-h-[30rem] overflow-hidden border-r border-white/10 bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-8">
          <div
            aria-hidden="true"
            className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-36 -right-20 h-96 w-96 rounded-full bg-blue-700/20 blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-3">
              <img
                src="/filmgeezer-logo-v1.webp"
                alt=""
                className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-sky-950/40"
              />

              <span className="text-xl font-black tracking-tight text-white">
                Film
                <span className="text-sky-400">
                  Geezer
                </span>
              </span>
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
              FilmGeezer account
            </p>

            <h2 className="mt-3 max-w-sm text-[2.15rem] font-black leading-tight text-white">
              {sideTitle}
            </h2>

            <p className="mt-4 max-w-sm leading-7 text-slate-400">
              {sideDescription}
            </p>
          </div>

          <p className="relative text-sm font-medium tracking-wide text-slate-500">
            Movies · TV Series · Anime · K-Drama
          </p>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.09),transparent_34%)]">
          <div className="z-20 flex items-center justify-between border-b border-white/8 bg-[radial-gradient(circle_at_left,rgba(14,165,233,0.2),transparent_48%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.94))] px-4 py-2.5 backdrop-blur lg:justify-end lg:border-b-0 lg:bg-gradient-to-b lg:from-slate-900 lg:via-slate-900/95 lg:to-transparent lg:px-4 lg:pb-0 lg:pt-2">
            <div className="inline-flex items-center gap-3 lg:hidden">
              <img
                src="/filmgeezer-logo-v1.webp"
                alt=""
                className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-sky-950/40"
              />

              <span className="text-lg font-black text-white">
                Film
                <span className="text-sky-400">
                  Geezer
                </span>
              </span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={isBusy}
              aria-label="Close authentication"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-slate-950/70 text-slate-300 transition hover:border-sky-300/30 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50 ${
                showCloseAttention
                  ? "border-cyan-200 bg-sky-400/15 text-white ring-4 ring-sky-300/35 shadow-[0_0_28px_rgba(56,189,248,0.55)]"
                  : "border-white/10"
              }`}
            >
              <CloseIcon className="h-5 w-5" />
            </button>

            <span
              aria-live="polite"
              className="sr-only"
            >
              {showCloseAttention
                ? "Use the close button to leave this authentication step."
                : ""}
            </span>
          </div>

          <div className="auth-surface-scrollbar min-h-0 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[30rem] px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-6 lg:pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              {eyebrow}
            </p>

            <h1
              id="filmgeezer-auth-title"
              className="mt-1.5 text-3xl font-black tracking-tight text-white sm:text-[2rem]"
            >
              {title}
            </h1>

            <p
              id="filmgeezer-auth-description"
              className="mt-1.5 max-w-lg text-sm leading-6 text-slate-400 sm:text-[0.95rem]"
            >
              {description}
            </p>

            <div className="mt-4 sm:mt-5">
              {children}
            </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return isModal
    ? createPortal(
        surface,
        document.body,
      )
    : surface;
}

export default AuthSurface;
