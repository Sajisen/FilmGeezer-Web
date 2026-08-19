import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";

import type {
  AuthVerificationReceipt,
} from "../../types/auth";

import {
  dismissActiveBrowserInput,
} from "../../utils/browserInput";

import {
  useAuth,
} from "./authContext";

import {
  getAuthReturnTo,
  readAuthRouteState,
  type AuthRoutePath,
} from "./authNavigation";

import AuthSurface from "./components/AuthSurface";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import RegistrationPendingForm from "./components/RegistrationPendingForm";
import ResetPasswordForm from "./components/ResetPasswordForm";
import VerifyEmailForm from "./components/VerifyEmailForm";

interface AuthRouteProps {
  mode:
    | "login"
    | "register"
    | "registration-pending"
    | "verify-email"
    | "forgot-password"
    | "reset-password";
}

const AUTH_COPY = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in",
    description:
      "Sign in to continue with your Watchlist, preferences, and account.",
    sideTitle: "Welcome back to FilmGeezer.",
    sideDescription:
      "Your saved titles, preferences, and account settings are ready when you are.",
  },

  register: {
    eyebrow: "Join FilmGeezer",
    title: "Create an account",
    description:
      "Continue with Google, or create your account with email and password.",
    sideTitle: "Make FilmGeezer yours.",
    sideDescription:
      "Save titles to your Watchlist, set your preferences, and get recommendations shaped around what you enjoy.",
  },

  "registration-pending": {
    eyebrow: "One more step",
    title: "Check your email",
    description:
      "We sent a verification email. Use it to finish creating your account.",
    sideTitle: "Check your inbox.",
    sideDescription:
      "Verify your email to finish setting up FilmGeezer and keep your account secure.",
  },

  "verify-email": {
    eyebrow: "Verify your email",
    title: "Enter your code",
    description:
      "Enter the newest six-digit code we sent to your email.",
    sideTitle: "One quick check.",
    sideDescription:
      "Confirm your email, then continue with your FilmGeezer account.",
  },

  "forgot-password": {
    eyebrow: "Account recovery",
    title: "Reset your password",
    description:
      "Enter your email and we’ll send you a secure password-reset link.",
    sideTitle: "Get back to your account.",
    sideDescription:
      "Request a reset link, choose a new password, and continue using FilmGeezer.",
  },

  "reset-password": {
    eyebrow: "Choose a new password",
    title: "Secure your account",
    description:
      "Choose a new password. We’ll sign out your other FilmGeezer sessions for security.",
    sideTitle: "Choose a fresh password.",
    sideDescription:
      "After the reset, sign in again and continue with your saved FilmGeezer account.",
  },
} as const;

function AuthRoute({
  mode,
}: AuthRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{
    challengeId?: string;
  }>();

  const [searchParams] =
    useSearchParams();

  const auth = useAuth();

  const routeState = useMemo(
    () =>
      readAuthRouteState(
        location.state,
      ),
    [location.state],
  );

  const isModal = Boolean(
    routeState.backgroundLocation,
  );

  const queryChallengeId =
    searchParams.get("challengeId");

  const [resetToken] = useState<
    string | null
  >(() => {
    if (
      mode !== "reset-password" ||
      location.hash.length <= 1
    ) {
      return null;
    }

    return location.hash.slice(1);
  });

  useEffect(() => {
    if (
      mode !== "reset-password" ||
      location.hash.length <= 1
    ) {
      return;
    }

    /*
     * The raw reset token arrives in the URL fragment so it is never sent
     * to the web server or in Referer headers. Keep it only in component
     * memory and remove it from the visible address bar immediately.
     */
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: "",
      },
      {
        replace: true,
        state: location.state,
      },
    );
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    mode,
    navigate,
  ]);

  const [verification, setVerification] =
    useState<AuthVerificationReceipt | null>(
      () => {
        if (routeState.verification) {
          return routeState.verification;
        }

        if (queryChallengeId) {
          return {
            challengeId: queryChallengeId,
            expiresAt: null,
            resendAvailableAt: null,
          };
        }

        return null;
      },
    );

  const [verificationEmail, setVerificationEmail] =
    useState<string | null>(
      routeState.email ?? null,
    );

  const [isBusy, setIsBusy] =
    useState(false);

  const [hasFormInput, setHasFormInput] =
    useState(false);

  const closeAuth = useCallback(() => {
    if (isBusy) {
      return;
    }

    dismissActiveBrowserInput();

    if (routeState.backgroundLocation) {
      navigate(-1);
      return;
    }

    navigate("/", {
      replace: true,
    });
  }, [isBusy, navigate, routeState]);

  useEffect(() => {
    if (
      auth.status !== "authenticated" ||
      mode === "reset-password"
    ) {
      return;
    }

    closeAuth();
  }, [auth.status, closeAuth, mode]);

  const navigateWithinAuth = useCallback(
    (
      path: AuthRoutePath,
      options?: {
        verification?: AuthVerificationReceipt;
        email?: string;
        notice?: string;
        markDirty?: boolean;
      },
    ) => {
      const nextVerification =
        options?.verification;

      const routeUsesChallengeId =
        path === "/registration-pending" ||
        path === "/verify-email";

      const search =
        routeUsesChallengeId &&
        nextVerification
          ? `?challengeId=${encodeURIComponent(nextVerification.challengeId)}`
          : "";

      dismissActiveBrowserInput();

      setHasFormInput(
        options?.markDirty ?? false,
      );

      navigate(`${path}${search}`, {
        replace: true,
        state: {
          ...routeState,
          verification: nextVerification,
          email: options?.email,
          notice: options?.notice,
        },
      });
    },
    [navigate, routeState],
  );

  const handleRegistrationSubmitted =
    useCallback(
      (
        nextVerification:
          AuthVerificationReceipt,
        email: string,
      ) => {
        setVerification(nextVerification);
        setVerificationEmail(email);
        setHasFormInput(false);

        navigateWithinAuth(
          "/registration-pending",
          {
            verification:
              nextVerification,
            email,
          },
        );
      },
      [navigateWithinAuth],
    );

  const handleVerificationRequired =
    useCallback(
      (
        nextVerification:
          AuthVerificationReceipt,
        email: string,
      ) => {
        setVerification(nextVerification);
        setVerificationEmail(email);
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
      [navigateWithinAuth],
    );

  const handleVerificationUpdated =
    useCallback(
      (
        nextVerification:
          AuthVerificationReceipt,
      ) => {
        setVerification(nextVerification);

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

      dismissActiveBrowserInput();
      setHasFormInput(false);

      if (routeState.backgroundLocation) {
        navigate(-1);
        return;
      }

      navigate(
        getAuthReturnTo(routeState),
        {
          replace: true,
        },
      );
    }, [auth, navigate, routeState]);

  const copy = AUTH_COPY[mode];

  const allowAmbientDismiss =
    (mode === "login" ||
      mode === "register" ||
      mode === "forgot-password") &&
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
      description={copy.description}
      sideTitle={copy.sideTitle}
      sideDescription={copy.sideDescription}
      onClose={closeAuth}
    >
      {mode === "login" && (
        <LoginForm
          key={`login:${verificationEmail ?? ""}`}
          initialEmail={
            verificationEmail ?? ""
          }
          notice={routeState.notice ?? null}
          onBusyChange={setIsBusy}
          onDirtyChange={setHasFormInput}
          onAuthenticated={
            handleAuthenticated
          }
          onSwitchToRegistration={() => {
            navigateWithinAuth("/register");
          }}
          onForgotPassword={(email) => {
            navigateWithinAuth(
              "/forgot-password",
              {
                email:
                  email || undefined,
                markDirty: Boolean(email),
              },
            );
          }}
          onVerificationRequired={
            handleVerificationRequired
          }
        />
      )}

      {mode === "register" && (
        <RegisterForm
          onAuthenticated={handleAuthenticated}
          onVerificationRequired={handleVerificationRequired}
          onBusyChange={setIsBusy}
          onDirtyChange={setHasFormInput}
          onRegistrationSubmitted={
            handleRegistrationSubmitted
          }
          onSwitchToLogin={() => {
            navigateWithinAuth("/login", {
              email:
                verificationEmail ??
                undefined,
              markDirty: Boolean(
                verificationEmail,
              ),
            });
          }}
          onForgotPassword={(email) => {
            navigateWithinAuth(
              "/forgot-password",
              {
                email:
                  email || undefined,
                markDirty: Boolean(email),
              },
            );
          }}
        />
      )}

      {mode === "registration-pending" && (
        <RegistrationPendingForm
          verification={verification}
          email={verificationEmail}
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
                markDirty: Boolean(
                  verificationEmail,
                ),
              },
            );
          }}
          onSwitchToLogin={() => {
            navigateWithinAuth("/login", {
              email:
                verificationEmail ??
                undefined,
              markDirty: Boolean(
                verificationEmail,
              ),
            });
          }}
          onSwitchToRegistration={() => {
            navigateWithinAuth("/register");
          }}
        />
      )}

      {mode === "verify-email" && (
        <VerifyEmailForm
          verification={verification}
          email={verificationEmail}
          onBusyChange={setIsBusy}
          onVerified={handleAuthenticated}
          onVerificationUpdated={
            handleVerificationUpdated
          }
          onSwitchToLogin={() => {
            navigateWithinAuth("/login", {
              email:
                verificationEmail ??
                undefined,
              markDirty: Boolean(
                verificationEmail,
              ),
            });
          }}
          onSwitchToRegistration={() => {
            navigateWithinAuth("/register");
          }}
        />
      )}

      {mode === "forgot-password" && (
        <ForgotPasswordForm
          initialEmail={
            routeState.email ?? ""
          }
          onBusyChange={setIsBusy}
          onDirtyChange={setHasFormInput}
          onSwitchToLogin={(email) => {
            navigateWithinAuth("/login", {
              email: email || undefined,
              markDirty: Boolean(email),
            });
          }}
        />
      )}

      {mode === "reset-password" && (
        <ResetPasswordForm
          challengeId={
            params.challengeId ?? null
          }
          token={resetToken}
          onBusyChange={setIsBusy}
          onDirtyChange={setHasFormInput}
          onCompleted={async (message) => {
            await auth.refreshSession();

            navigateWithinAuth("/login", {
              notice: message,
            });
          }}
          onRequestNewLink={() => {
            navigateWithinAuth(
              "/forgot-password",
            );
          }}
          onSwitchToLogin={() => {
            navigateWithinAuth("/login");
          }}
        />
      )}
    </AuthSurface>
  );
}

export default AuthRoute;
