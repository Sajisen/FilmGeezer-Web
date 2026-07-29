import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  AuthApiError,
  resendLocalEmailVerification,
  verifyLocalEmail,
} from "../../../services/authService";

import type {
  AuthVerificationReceipt,
} from "../../../types/auth";

import {
  AuthFormMessage,
  AuthSubmitButton,
} from "./AuthFields";

import OneTimeCodeInput, {
  type OneTimeCodeInputHandle,
} from "./OneTimeCodeInput";

interface VerifyEmailFormProps {
  verification: AuthVerificationReceipt | null;
  email: string | null;
  onVerified: () => Promise<void>;
  onVerificationUpdated: (
    verification: AuthVerificationReceipt,
  ) => void;
  onSwitchToLogin: () => void;
  onSwitchToRegistration: () => void;
  onBusyChange: (
    isBusy: boolean,
  ) => void;
}

interface VerificationInteractionState {
  challengeId: string | null;
  code: string;
  errorMessage: string | null;
  successMessage: string | null;
  attemptsRemaining: number | null;
}

interface LastSubmittedCode {
  challengeId: string | null;
  code: string | null;
}

function createVerificationInteractionState(
  challengeId: string | null,
  successMessage: string | null = null,
): VerificationInteractionState {
  return {
    challengeId,
    code: "",
    errorMessage: null,
    successMessage,
    attemptsRemaining: null,
  };
}

function parseTimestamp(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const timestamp =
    Date.parse(value);

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : null;
}

function formatCountdown(
  milliseconds: number,
): string {
  const totalSeconds =
    Math.max(
      0,
      Math.ceil(
        milliseconds / 1_000,
      ),
    );

  const minutes =
    Math.floor(
      totalSeconds / 60,
    );

  const seconds =
    totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${seconds}s`;
}

function VerifyEmailForm({
  verification,
  email,
  onVerified,
  onVerificationUpdated,
  onSwitchToLogin,
  onSwitchToRegistration,
  onBusyChange,
}: VerifyEmailFormProps) {
  const challengeId =
    verification?.challengeId ??
    null;

  const [interaction, setInteraction] =
    useState<VerificationInteractionState>(
      () =>
        createVerificationInteractionState(
          challengeId,
        ),
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  const [now, setNow] =
    useState(() => Date.now());

  const inputRef =
    useRef<OneTimeCodeInputHandle>(
      null,
    );

  const lastSubmittedCodeRef =
    useRef<LastSubmittedCode>({
      challengeId,
      code: null,
    });

  const requestInFlightRef =
    useRef(false);

  const currentInteraction =
    interaction.challengeId ===
    challengeId
      ? interaction
      : createVerificationInteractionState(
          challengeId,
        );

  const {
    code,
    errorMessage,
    successMessage,
    attemptsRemaining,
  } = currentInteraction;

  const isBusy =
    isSubmitting ||
    isResending;

  const updateInteraction =
    useCallback(
      (
        updater: (
          currentState: VerificationInteractionState,
        ) => VerificationInteractionState,
      ) => {
        setInteraction(
          (
            currentState,
          ) => {
            const stateForCurrentChallenge =
              currentState.challengeId ===
              challengeId
                ? currentState
                : createVerificationInteractionState(
                    challengeId,
                  );

            return updater(
              stateForCurrentChallenge,
            );
          },
        );
      },
      [challengeId],
    );

  useEffect(() => {
    onBusyChange(isBusy);

    return () => {
      onBusyChange(false);
    };
  }, [
    isBusy,
    onBusyChange,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setNow(Date.now());
        },
        1_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  useEffect(() => {
    lastSubmittedCodeRef.current = {
      challengeId,
      code: null,
    };

    const focusTimer =
      window.setTimeout(
        () => {
          inputRef.current?.focus();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        focusTimer,
      );
    };
  }, [challengeId]);

  const resendAvailableAt =
    parseTimestamp(
      verification
        ?.resendAvailableAt ??
        null,
    );

  const expiresAt =
    parseTimestamp(
      verification?.expiresAt ??
        null,
    );

  const resendMilliseconds =
    resendAvailableAt === null
      ? 0
      : Math.max(
          0,
          resendAvailableAt -
            now,
        );

  const expiryMilliseconds =
    expiresAt === null
      ? null
      : Math.max(
          0,
          expiresAt - now,
        );

  const canResend =
    Boolean(challengeId) &&
    resendMilliseconds === 0 &&
    !isBusy;

  const submitVerification =
    useCallback(
      async (
        submittedCode: string,
      ) => {
        if (
          !challengeId ||
          submittedCode.length !==
            6 ||
          requestInFlightRef.current
        ) {
          return;
        }

        requestInFlightRef.current =
          true;
        setIsSubmitting(true);

        updateInteraction(
          (
            currentState,
          ) => ({
            ...currentState,
            errorMessage: null,
            successMessage: null,
          }),
        );

        try {
          await verifyLocalEmail({
            challengeId,
            code: submittedCode,
          });

          await onVerified();
        } catch (error) {
          const apiError =
            error instanceof
              AuthApiError
              ? error
              : null;

          const nextAttemptsRemaining =
            typeof apiError
              ?.payload
              .attemptsRemaining ===
            "number"
              ? apiError.payload
                  .attemptsRemaining
              : null;

          const shouldClearCode =
            apiError?.code ===
              "AUTH_VERIFICATION_CODE_INVALID" ||
            apiError?.code ===
              "AUTH_VERIFICATION_EXPIRED";

          updateInteraction(
            (
              currentState,
            ) => ({
              ...currentState,
              code: shouldClearCode
                ? ""
                : currentState.code,
              errorMessage:
                error instanceof Error
                  ? error.message
                  : "FilmGeezer could not verify this code.",
              successMessage: null,
              attemptsRemaining:
                nextAttemptsRemaining,
            }),
          );

          if (shouldClearCode) {
            lastSubmittedCodeRef.current = {
              challengeId,
              code: null,
            };

            window.setTimeout(
              () => {
                inputRef.current?.focus();
              },
              0,
            );
          }
        } finally {
          requestInFlightRef.current =
            false;
          setIsSubmitting(false);
        }
      },
      [
        challengeId,
        onVerified,
        updateInteraction,
      ],
    );

  useEffect(() => {
    const lastSubmittedCode =
      lastSubmittedCodeRef.current;

    if (
      !challengeId ||
      code.length !== 6 ||
      isBusy ||
      (lastSubmittedCode.challengeId ===
        challengeId &&
        lastSubmittedCode.code ===
          code)
    ) {
      return;
    }

    const submissionTimer =
      window.setTimeout(
        () => {
          if (
            requestInFlightRef.current
          ) {
            return;
          }

          lastSubmittedCodeRef.current = {
            challengeId,
            code,
          };

          void submitVerification(
            code,
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        submissionTimer,
      );
    };
  }, [
    challengeId,
    code,
    isBusy,
    submitVerification,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !challengeId ||
      code.length !== 6 ||
      requestInFlightRef.current
    ) {
      return;
    }

    lastSubmittedCodeRef.current = {
      challengeId,
      code,
    };

    await submitVerification(code);
  }

  async function handleResend() {
    if (
      !challengeId ||
      !canResend ||
      requestInFlightRef.current
    ) {
      return;
    }

    requestInFlightRef.current =
      true;
    setIsResending(true);

    updateInteraction(
      (
        currentState,
      ) => ({
        ...currentState,
        errorMessage: null,
        successMessage: null,
      }),
    );

    try {
      const response =
        await resendLocalEmailVerification(
          {
            challengeId,
          },
        );

      const nextVerification =
        response.verification;

      setInteraction(
        createVerificationInteractionState(
          nextVerification.challengeId,
          "New code sent. Use the latest one.",
        ),
      );

      lastSubmittedCodeRef.current = {
        challengeId:
          nextVerification.challengeId,
        code: null,
      };

      setNow(Date.now());

      onVerificationUpdated(
        nextVerification,
      );

      window.setTimeout(
        () => {
          inputRef.current?.focus();
        },
        0,
      );
    } catch (error) {
      if (
        error instanceof
          AuthApiError &&
        error.code ===
          "AUTH_VERIFICATION_RESEND_COOLDOWN" &&
        typeof error.payload
          .retryAt === "string" &&
        verification
      ) {
        onVerificationUpdated({
          ...verification,
          resendAvailableAt:
            error.payload.retryAt,
        });

        setNow(Date.now());
      }

      updateInteraction(
        (
          currentState,
        ) => ({
          ...currentState,
          errorMessage:
            error instanceof Error
              ? error.message
              : "FilmGeezer could not send another code.",
          successMessage: null,
        }),
      );
    } finally {
      requestInFlightRef.current =
        false;
      setIsResending(false);
    }
  }

  if (!challengeId) {
    return (
      <div className="space-y-4">
        <AuthFormMessage
          message="This verification request is no longer available. Start again or sign in."
        />

        <button
          type="button"
          onClick={
            onSwitchToRegistration
          }
          className="min-h-12 w-full rounded-xl bg-sky-500 px-5 font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          Create an account
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-5 font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <p className="text-sm leading-6 text-slate-400">
        Code sent to{" "}
        <span className="font-semibold text-slate-200">
          {email ||
            "your email address"}
        </span>
        .
      </p>

      <AuthFormMessage
        message={errorMessage}
      />

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
        >
          {successMessage}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">
          Verification code
        </label>

        <OneTimeCodeInput
          ref={inputRef}
          value={code}
          disabled={isBusy}
          hasError={
            Boolean(
              errorMessage,
            )
          }
          autoFocus
          onChange={(
            nextCode,
          ) => {
            updateInteraction(
              (
                currentState,
              ) => ({
                ...currentState,
                code: nextCode,
                errorMessage: null,
                successMessage: null,
              }),
            );

            if (
              nextCode !==
              lastSubmittedCodeRef
                .current.code
            ) {
              lastSubmittedCodeRef.current = {
                challengeId,
                code: null,
              };
            }
          }}
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Verification starts automatically after the sixth digit.
        </p>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs leading-5">
          <span className="text-slate-500">
            {expiryMilliseconds ===
            null
              ? "This code is valid for a limited time."
              : expiryMilliseconds >
                  0
                ? `Expires in ${formatCountdown(expiryMilliseconds)}`
                : "Code expired. Request a new one."}
          </span>

          {attemptsRemaining !==
            null && (
            <span className="font-semibold text-amber-200">
              {attemptsRemaining}{" "}
              {attemptsRemaining ===
              1
                ? "attempt"
                : "attempts"}{" "}
              remaining
            </span>
          )}
        </div>
      </div>

      <AuthSubmitButton
        label="Verify email"
        loadingLabel="Verifying…"
        isSubmitting={
          isSubmitting
        }
        disabled={
          code.length !== 6 ||
          isResending
        }
      />

      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            void handleResend();
          }}
          disabled={!canResend}
          className="min-h-10 rounded-full px-4 font-semibold text-sky-300 transition hover:bg-sky-400/10 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          {isResending
            ? "Sending…"
            : resendMilliseconds >
                0
              ? `Resend in ${formatCountdown(resendMilliseconds)}`
              : "Resend code"}
        </button>

        <button
          type="button"
          onClick={
            onSwitchToLogin
          }
          disabled={isBusy}
          className="text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50"
        >
          Use a different account
        </button>
      </div>
    </form>
  );
}

export default VerifyEmailForm;
