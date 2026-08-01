export const PASSWORD_STRENGTH_VALUES = [
  "invalid",
  "weak",
  "fair",
  "good",
  "strong",
] as const;

export type PasswordStrength =
  (typeof PASSWORD_STRENGTH_VALUES)[number];

export interface PasswordStrengthAssessment {
  accepted: boolean;
  strength: PasswordStrength;
  score: number;
  characterCount: number;
  message: string;
}

interface ZxcvbnResultLike {
  score: number;
  feedback: {
    warning: string | null;
    suggestions: string[];
  };
}

interface PasswordEstimatorLike {
  check(
    password: string,
    userInputs?: string[],
  ): ZxcvbnResultLike;
}

let passwordEstimatorPromise:
  Promise<PasswordEstimatorLike> | null =
  null;

function countUnicodeCodePoints(
  value: string,
): number {
  return Array.from(value).length;
}

function createUserInputs(
  email: string,
  displayName: string,
): string[] {
  const values = new Set<string>([
    "filmgeezer",
    "film geezer",
    "filmgeezer web",
  ]);

  const emailLocalPart =
    email
      .trim()
      .toLowerCase()
      .split("@")[0]
      ?.trim();

  if (
    emailLocalPart &&
    emailLocalPart.length >= 3
  ) {
    values.add(emailLocalPart);
  }

  const normalizedDisplayName =
    displayName
      .trim()
      .replace(/\s+/gu, " ");

  if (
    normalizedDisplayName.length >= 3
  ) {
    values.add(
      normalizedDisplayName,
    );

    for (
      const namePart of
      normalizedDisplayName.split(" ")
    ) {
      if (namePart.length >= 3) {
        values.add(namePart);
      }
    }
  }

  return [...values];
}

async function getPasswordEstimator():
  Promise<PasswordEstimatorLike> {
  if (passwordEstimatorPromise) {
    return passwordEstimatorPromise;
  }

  const estimatorPromise:
    Promise<PasswordEstimatorLike> =
    Promise.all([
      import("@zxcvbn-ts/core"),
      import(
        "@zxcvbn-ts/language-common"
      ),
      import(
        "@zxcvbn-ts/language-en"
      ),
    ]).then(
      ([
        corePackage,
        commonPackage,
        englishPackage,
      ]) => {
        return new corePackage.ZxcvbnFactory(
          {
            translations:
              englishPackage.translations,

            graphs:
              commonPackage.adjacencyGraphs,

            dictionary: {
              ...commonPackage.dictionary,
              ...englishPackage.dictionary,
            },
          },
        );
      },
    );

  passwordEstimatorPromise =
    estimatorPromise.catch(
      (error: unknown) => {
        passwordEstimatorPromise =
          null;

        throw error;
      },
    );

  return passwordEstimatorPromise;
}

function getStrengthFromScore(
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

export async function assessClientPasswordStrength(
  input: {
    password: string;
    email: string;
    displayName: string;
  },
): Promise<PasswordStrengthAssessment> {
  const characterCount =
    countUnicodeCodePoints(
      input.password,
    );

  if (characterCount < 8) {
    return {
      accepted: false,
      strength: "invalid",
      score: 0,
      characterCount,
      message:
        "Use at least 8 characters.",
    };
  }

  if (characterCount > 128) {
    return {
      accepted: false,
      strength: "invalid",
      score: 0,
      characterCount,
      message:
        "Use no more than 128 characters.",
    };
  }

  const estimator =
    await getPasswordEstimator();

  const result = estimator.check(
    input.password,
    createUserInputs(
      input.email,
      input.displayName,
    ),
  );

  const strength =
    getStrengthFromScore(
      result.score,
    );

  const accepted =
    result.score >= 2;

  const message =
    result.feedback.warning ||
    result.feedback
      .suggestions[0] ||
    (accepted
      ? strength === "strong"
        ? "Excellent. This password is difficult to guess."
        : strength === "good"
          ? "Good password. A longer passphrase can make it even stronger."
          : "Accepted, but a less predictable passphrase would be stronger."
      : "Choose a less common password that is unrelated to your name or FilmGeezer.");

  return {
    accepted,
    strength,
    score: result.score,
    characterCount,
    message,
  };
}