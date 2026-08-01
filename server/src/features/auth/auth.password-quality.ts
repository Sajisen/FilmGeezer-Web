import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnglishPackage from "@zxcvbn-ts/language-en";
import {
  AUTH_INPUT_LIMITS,
  AUTH_PASSWORD_QUALITY_POLICY,
} from "./auth.constants.js";

const passwordEstimator = new ZxcvbnFactory({
  translations: zxcvbnEnglishPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnglishPackage.dictionary,
  },
});

export const PASSWORD_STRENGTH_VALUES = [
  "invalid",
  "weak",
  "fair",
  "good",
  "strong",
] as const;

export type PasswordStrength =
  (typeof PASSWORD_STRENGTH_VALUES)[number];

export const PASSWORD_REJECTION_REASON_VALUES = [
  "too-short",
  "too-long",
  "common-or-predictable",
] as const;

export type PasswordRejectionReason =
  (typeof PASSWORD_REJECTION_REASON_VALUES)[number];

export interface AssessPasswordQualityInput {
  password: string;
  emailNormalized?: string;
  displayName?: string;
}

export interface PasswordQualityAssessment {
  accepted: boolean;

  strength: PasswordStrength;
  score: number;

  characterCount: number;

  rejectionReason: PasswordRejectionReason | null;

  warning: string | null;
  suggestions: string[];
}

function countUnicodeCodePoints(value: string): number {
  return Array.from(value).length;
}

function createUserInputs(
  emailNormalized?: string,
  displayName?: string,
): string[] {
  const values = new Set<string>([
    "filmgeezer",
    "film geezer",
    "filmgeezer web",
  ]);

  const emailLocalPart =
    emailNormalized?.split("@")[0]?.trim();

  if (emailLocalPart && emailLocalPart.length >= 3) {
    values.add(emailLocalPart);
  }

  if (displayName) {
    const normalizedDisplayName = displayName
      .trim()
      .replace(/\s+/gu, " ");

    if (normalizedDisplayName.length >= 3) {
      values.add(normalizedDisplayName);
    }

    for (const namePart of normalizedDisplayName.split(" ")) {
      if (namePart.length >= 3) {
        values.add(namePart);
      }
    }
  }

  return [...values];
}

function determineAcceptedStrength(
  score: number,
): PasswordStrength {
  if (score <= 1) {
    return "weak";
  }

  if (score === 2) {
    return "fair";
  }

  if (score === 3) {
    return "good";
  }

  return "strong";
}

export function assessPasswordQuality(
  input: AssessPasswordQualityInput,
): PasswordQualityAssessment {
  const characterCount = countUnicodeCodePoints(
    input.password,
  );

  if (
    characterCount <
    AUTH_INPUT_LIMITS.passwordMinimumLength
  ) {
    return {
      accepted: false,
      strength: "invalid",
      score: 0,
      characterCount,
      rejectionReason: "too-short",
      warning: null,
      suggestions: [
        `Use at least ${AUTH_INPUT_LIMITS.passwordMinimumLength} characters.`,
      ],
    };
  }

  if (
    characterCount >
    AUTH_INPUT_LIMITS.passwordMaximumLength
  ) {
    return {
      accepted: false,
      strength: "invalid",
      score: 0,
      characterCount,
      rejectionReason: "too-long",
      warning: null,
      suggestions: [
        `Use no more than ${AUTH_INPUT_LIMITS.passwordMaximumLength} characters.`,
      ],
    };
  }

  const result = passwordEstimator.check(
    input.password,
    createUserInputs(
      input.emailNormalized,
      input.displayName,
    ),
  );

  if (
    result.score <
    AUTH_PASSWORD_QUALITY_POLICY.minimumAcceptedScore
  ) {
    return {
      accepted: false,
      strength: "weak",
      score: result.score,
      characterCount,
      rejectionReason: "common-or-predictable",
      warning:
        result.feedback.warning ||
        "This password is too common or predictable.",
      suggestions:
        result.feedback.suggestions.length > 0
          ? [...result.feedback.suggestions]
          : [
              "Choose a less common password that is unrelated to your name or FilmGeezer.",
            ],
    };
  }

  return {
    accepted: true,

    strength: determineAcceptedStrength(
      result.score,
    ),

    score: result.score,
    characterCount,

    rejectionReason: null,

    warning: result.feedback.warning || null,
    suggestions: [...result.feedback.suggestions],
  };
}