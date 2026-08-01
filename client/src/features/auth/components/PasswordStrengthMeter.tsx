import {
  useEffect,
  useState,
} from "react";

import {
  assessClientPasswordStrength,
  type PasswordStrengthAssessment,
} from "../passwordStrength";

interface PasswordStrengthMeterProps {
  password: string;
  email: string;
  displayName: string;
  onAssessmentChange?: (
    assessment:
      | PasswordStrengthAssessment
      | null,
  ) => void;
}

interface AssessmentSnapshot {
  requestKey: string;
  assessment: PasswordStrengthAssessment;
}

const STRENGTH_LABELS = {
  invalid: "Invalid",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
} as const;

const STRENGTH_SEGMENTS = {
  invalid: 0,
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
} as const;

function createAssessmentRequestKey(
  password: string,
  email: string,
  displayName: string,
): string {
  return JSON.stringify([
    password,
    email,
    displayName,
  ]);
}

function PasswordStrengthMeter({
  password,
  email,
  displayName,
  onAssessmentChange,
}: PasswordStrengthMeterProps) {
  const [snapshot, setSnapshot] =
    useState<AssessmentSnapshot | null>(
      null,
    );

  const requestKey =
    createAssessmentRequestKey(
      password,
      email,
      displayName,
    );

  const assessment =
    snapshot?.requestKey === requestKey
      ? snapshot.assessment
      : null;

  const isChecking =
    password.length > 0 &&
    assessment === null;

  useEffect(() => {
    if (!password) {
      return;
    }

    let isCurrent = true;

    const timer = window.setTimeout(
      () => {
        void assessClientPasswordStrength(
          {
            password,
            email,
            displayName,
          },
        )
          .then(
            (
              nextAssessment,
            ) => {
              if (!isCurrent) {
                return;
              }

              setSnapshot({
                requestKey,
                assessment:
                  nextAssessment,
              });

              onAssessmentChange?.(
                nextAssessment,
              );
            },
          )
          .catch(() => {
            if (!isCurrent) {
              return;
            }

            const fallbackAssessment:
              PasswordStrengthAssessment = {
                accepted: false,
                strength: "invalid",
                score: 0,
                characterCount:
                  Array.from(
                    password,
                  ).length,
                message:
                  "Password checking is unavailable. Try again.",
              };

            setSnapshot({
              requestKey,
              assessment:
                fallbackAssessment,
            });

            onAssessmentChange?.(
              fallbackAssessment,
            );
          });
      },
      180,
    );

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [
    displayName,
    email,
    onAssessmentChange,
    password,
    requestKey,
  ]);

  if (!password) {
    return (
      <p className="mt-1.5 text-xs leading-5 text-slate-500">
        Use 8–128 characters and avoid common names or phrases.
      </p>
    );
  }

  const strength =
    assessment?.strength ??
    "invalid";

  const activeSegments =
    STRENGTH_SEGMENTS[strength];

  return (
    <div
      className="mt-2.5"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="grid flex-1 grid-cols-4 gap-1.5"
          aria-hidden="true"
        >
          {Array.from(
            {
              length: 4,
            },
            (
              _unused,
              index,
            ) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition ${
                  index <
                  activeSegments
                    ? strength ===
                        "strong"
                      ? "bg-emerald-400"
                      : strength ===
                          "good"
                        ? "bg-sky-300"
                        : strength ===
                            "fair"
                          ? "bg-amber-300"
                          : "bg-rose-400"
                    : "bg-white/10"
                }`}
              />
            ),
          )}
        </div>

        <span
          className={`text-xs font-semibold ${
            strength === "strong"
              ? "text-emerald-300"
              : strength === "good"
                ? "text-sky-300"
                : strength === "fair"
                  ? "text-amber-200"
                  : "text-rose-300"
          }`}
        >
          {isChecking
            ? "Checking…"
            : STRENGTH_LABELS[
                strength
              ]}
        </span>
      </div>

      <p
        className={`mt-1.5 text-xs leading-5 ${
          assessment?.accepted
            ? "text-slate-400"
            : "text-rose-200"
        }`}
      >
        {assessment?.message ??
          "Checking password quality…"}
      </p>
    </div>
  );
}

export default PasswordStrengthMeter;
