import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";

import type {
  AuthVerificationReceipt,
} from "../../types/auth";

import {
  useAuth,
} from "./authContext";

import {
  getAuthReturnTo,
  readAuthRouteState,
  type AuthRoutePath,
} from "./authNavigation";

import AuthSurface from "./components/AuthSurface";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import RegistrationPendingForm from "./components/RegistrationPendingForm";
import VerifyEmailForm from "./components/VerifyEmailForm";

interface AuthRouteProps {
  mode:
    | "login"
    | "register"
    | "registration-pending"
    | "verify-email";
}

const AUTH_COPY = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in",
    description:
      "Access your FilmGeezer account.",
  },

  register: {
    eyebrow: "Join FilmGeezer",
    title: "Create an account",
    description:
      "Use your email, then follow the next step we send.",
  },

  "registration-pending": {
    eyebrow: "One more step",
    title: "Check your email",
    description:
      "Continue with the private instructions sent to your inbox.",
  },

  "verify-email": {
    eyebrow: "Verify your email",
    title: "Enter your code",
    description:
      "Use the newest six-digit code from FilmGeezer.",
  },
} as const;

function AuthRoute({
  mode,
}: AuthRouteProps) {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const auth =
    useAuth();

  const routeState =
    useMemo(
      () =>
        readAuthRouteState(
          location.state,
        ),
      [location.state],
    );

  const isModal =
    Boolean(
      routeState
        .backgroundLocation,
    );

  const queryChallengeId =
    searchParams.get(
      "challengeId",
    );

  const [
    verification,
    setVerification,
  ] =
    useState<AuthVerificationReceipt | null>(
      () => {
        if (
          routeState
            .verification
        ) {
          return routeState
            .verification;
        }

        if (
          queryChallengeId
        ) {
          return {
            challengeId:
              queryChallengeId,

            expiresAt: null,

            resendAvailableAt:
              null,
          };
        }

        return null;
      },
    );

  const [
    verificationEmail,
    setVerificationEmail,
  ] =
    useState<string | null>(
      routeState.email ??
        null,
    );

  const [isBusy, setIsBusy] =
    useState(false);

  const [hasFormInput, setHasFormInput] =
    useState(false);

  const closeAuth =
    useCallback(() => {
      if (isBusy) {
        return;
      }

      if (
        routeState
          .backgroundLocation
      ) {
        navigate(-1);
        return;
      }

      navigate("/", {
        replace: true,
      });
    }, [
      isBusy,
      navigate,
      routeState,
    ]);

  useEffect(() => {
    if (
      auth.status !==
      "authenticated"
    ) {
      return;
    }

    closeAuth();
  }, [
    auth.status,
    closeAuth,
  ]);

  const navigateWithinAuth =
    useCallback(
      (
        path: AuthRoutePath,
        options?: {
          verification?: AuthVerificationReceipt;
          email?: string;
          markDirty?: boolean;
        },
      ) => {
        const nextVerification =
          options?.verification;

        const routeUsesChallengeId =
          path ===
            "/registration-pending" ||
          path ===
            "/verify-email";

        const search =
          routeUsesChallengeId &&
          nextVerification
            ? `?challengeId=${encodeURIComponent(nextVerification.challengeId)}`
            : "";

        setHasFormInput(
          options?.markDirty ??
            false,
        );

        navigate(
          `${path}${search}`,
          {
            replace: true,

            state: {
              ...routeState,

              verification:
                nextVerification,

              email:
                options?.email,
            },
          },
        );
      },
      [
        navigate,
        routeState,
      ],
    );

  const handleRegistrationSubmitted =
    useCallback(
      (
        nextVerification:
          AuthVerificationReceipt,

        email: string,
      ) => {
        setVerification(
          nextVerification,
        );

        setVerificationEmail(
          email,
        );

        setHasFormInput(false);

        /*
         * Registration intentionally lands on a neutral inbox step.
         * The public browser response does not disclose whether the
         * email already belongs to an account. A new account can enter
         * its code, while an existing account can move directly to sign
         * in without being trapped on a decoy OTP screen.
         */
        navigateWithinAuth(
          "/registration-pending",
          {
            verification:
              nextVerification,

            email,
          },
        );
      },
      [
        navigateWithinAuth,
      ],
    );

  const handleVerificationRequired =
    useCallback(
      (
        nextVerification:
          AuthVerificationReceipt,

        email: string,
      ) => {
        setVerification(
          nextVerification,
        );

        setVerificationEmail(
          email,
        );

        setHasFormInput(false);

        navigateWithinAuth(
          "/verify-email",
          {
            verification:
              nextVerification,

            email,
          },
        );
      },
      [
        navigateWithinAuth,
      ],
    );

  const handleVerificationUpdated =
    useCallback(
      (
        nextVerification:
          AuthVerificationReceipt,
      ) => {
        setVerification(
          nextVerification,
        );

        navigateWithinAuth(
          "/verify-email",
          {
            verification:
              nextVerification,

            email:
              verificationEmail ??
              undefined,
          },
        );
      },
      [
        navigateWithinAuth,
        verificationEmail,
      ],
    );

  const handleAuthenticated =
    useCallback(async () => {
      const sessionWasLoaded =
        await auth.completeAuthentication();

      if (!sessionWasLoaded) {
        throw new Error(
          "Your account was authenticated, but FilmGeezer could not load the new session. Refresh the page and try again.",
        );
      }

      setHasFormInput(false);

      if (
        routeState
          .backgroundLocation
      ) {
        navigate(-1);
        return;
      }

      navigate(
        getAuthReturnTo(
          routeState,
        ),
        {
          replace: true,
        },
      );
    }, [
      auth,
      navigate,
      routeState,
    ]);

  const copy =
    AUTH_COPY[mode];

  const allowAmbientDismiss =
    (mode === "login" ||
      mode === "register") &&
    !hasFormInput &&
    !isBusy;

  return (
    <AuthSurface
      isModal={isModal}
      isBusy={isBusy}
      allowAmbientDismiss={
        allowAmbientDismiss
      }
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={
        copy.description
      }
      onClose={closeAuth}
    >
      {mode === "login" && (
        <LoginForm
          key={`login:${verificationEmail ?? ""}`}
          initialEmail={
            verificationEmail ??
            ""
          }
          onBusyChange={
            setIsBusy
          }
          onDirtyChange={
            setHasFormInput
          }
          onAuthenticated={
            handleAuthenticated
          }
          onSwitchToRegistration={() => {
            navigateWithinAuth(
              "/register",
            );
          }}
          onVerificationRequired={
            handleVerificationRequired
          }
        />
      )}

      {mode === "register" && (
        <RegisterForm
          onBusyChange={
            setIsBusy
          }
          onDirtyChange={
            setHasFormInput
          }
          onRegistrationSubmitted={
            handleRegistrationSubmitted
          }
          onSwitchToLogin={() => {
            navigateWithinAuth(
              "/login",
              {
                email:
                  verificationEmail ??
                  undefined,

                markDirty:
                  Boolean(
                    verificationEmail,
                  ),
              },
            );
          }}
        />
      )}

      {mode ===
        "registration-pending" && (
        <RegistrationPendingForm
          verification={
            verification
          }
          email={
            verificationEmail
          }
          onEnterVerificationCode={() => {
            if (!verification) {
              return;
            }

            navigateWithinAuth(
              "/verify-email",
              {
                verification,
                email:
                  verificationEmail ??
                  undefined,

                markDirty:
                  Boolean(
                    verificationEmail,
                  ),
              },
            );
          }}
          onSwitchToLogin={() => {
            navigateWithinAuth(
              "/login",
              {
                email:
                  verificationEmail ??
                  undefined,

                markDirty:
                  Boolean(
                    verificationEmail,
                  ),
              },
            );
          }}
          onSwitchToRegistration={() => {
            navigateWithinAuth(
              "/register",
            );
          }}
        />
      )}

      {mode ===
        "verify-email" && (
        <VerifyEmailForm
          verification={
            verification
          }
          email={
            verificationEmail
          }
          onBusyChange={
            setIsBusy
          }
          onVerified={
            handleAuthenticated
          }
          onVerificationUpdated={
            handleVerificationUpdated
          }
          onSwitchToLogin={() => {
            navigateWithinAuth(
              "/login",
              {
                email:
                  verificationEmail ??
                  undefined,

                markDirty:
                  Boolean(
                    verificationEmail,
                  ),
              },
            );
          }}
          onSwitchToRegistration={() => {
            navigateWithinAuth(
              "/register",
            );
          }}
        />
      )}
    </AuthSurface>
  );
}

export default AuthRoute;
