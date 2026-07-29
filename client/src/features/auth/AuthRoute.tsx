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
import VerifyEmailForm from "./components/VerifyEmailForm";

interface AuthRouteProps {
  mode:
    | "login"
    | "register"
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
      "Use your email, then confirm a six-digit code.",
  },

  "verify-email": {
    eyebrow: "Check your inbox",
    title: "Verify your email",
    description:
      "Enter the six-digit code we sent you.",
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
        },
      ) => {
        const nextVerification =
          options?.verification;

        const search =
          path ===
            "/verify-email" &&
          nextVerification
            ? `?challengeId=${encodeURIComponent(nextVerification.challengeId)}`
            : "";

        setHasFormInput(false);

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
    mode !== "verify-email" &&
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
          onRegistrationAccepted={
            handleVerificationRequired
          }
          onSwitchToLogin={() => {
            navigateWithinAuth(
              "/login",
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
