import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AdminApiError,
  cancelAdminMfaLogin,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  verifyAdminMfaLogin,
} from "../services/adminService";
import type {
  AdminAuthStatus,
  AdminMfaChallengeState,
  AdminSecuritySummary,
  AdminSessionSummary,
  AdminUser,
} from "../types/admin";
import {
  AdminAuthContext,
  type AdminAuthContextValue,
} from "./adminAuthContext";

interface AdminAuthState {
  status: AdminAuthStatus;
  user: AdminUser | null;
  session: AdminSessionSummary | null;
  security: AdminSecuritySummary | null;
  csrfToken: string | null;
  mfaChallenge: AdminMfaChallengeState | null;
  errorMessage: string | null;
}

const INITIAL_STATE: AdminAuthState = {
  status: "bootstrapping",
  user: null,
  session: null,
  security: null,
  csrfToken: null,
  mfaChallenge: null,
  errorMessage: null,
};

function authenticatedStatus(
  accessLevel: AdminSessionSummary["accessLevel"],
): AdminAuthStatus {
  return accessLevel === "mfa-enrollment"
    ? "mfa-enrollment"
    : "authenticated";
}

export function AdminAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<AdminAuthState>(INITIAL_STATE);

  const refreshSession = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await getAdminSession(signal);
      setState({
        status: authenticatedStatus(response.session.accessLevel),
        user: response.user,
        session: response.session,
        security: response.security,
        csrfToken: response.csrfToken,
        mfaChallenge: null,
        errorMessage: null,
      });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }

      if (error instanceof AdminApiError && error.status === 401) {
        setState({
          status: "guest",
          user: null,
          session: null,
          security: null,
          csrfToken: null,
          mfaChallenge: null,
          errorMessage: null,
        });
        return false;
      }

      setState({
        status: "guest",
        user: null,
        session: null,
        security: null,
        csrfToken: null,
        mfaChallenge: null,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Administrator access could not be checked.",
      });
      return false;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refreshSession(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshSession]);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await loginAdmin(input);

      if (response.code === "ADMIN_MFA_CHALLENGE_REQUIRED") {
        setState({
          status: "mfa-required",
          user: null,
          session: null,
          security: null,
          csrfToken: null,
          mfaChallenge: response.challenge,
          errorMessage: null,
        });
        return;
      }

      setState({
        status: authenticatedStatus(response.session.accessLevel),
        user: response.user,
        session: response.session,
        security: response.security,
        csrfToken: response.csrfToken,
        mfaChallenge: null,
        errorMessage: null,
      });
    },
    [],
  );

  const verifyMfa = useCallback(
    async (input: {
      method: "totp" | "recovery";
      code: string;
    }) => {
      const response = await verifyAdminMfaLogin(input);
      setState({
        status: "authenticated",
        user: response.user,
        session: response.session,
        security: response.security,
        csrfToken: response.csrfToken,
        mfaChallenge: null,
        errorMessage: null,
      });
    },
    [],
  );

  const cancelMfa = useCallback(async () => {
    try {
      await cancelAdminMfaLogin();
    } finally {
      setState({
        status: "guest",
        user: null,
        session: null,
        security: null,
        csrfToken: null,
        mfaChallenge: null,
        errorMessage: null,
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    const csrfToken = state.csrfToken;

    try {
      if (csrfToken) {
        await logoutAdmin(csrfToken);
      }
    } catch (error) {
      if (!(error instanceof AdminApiError && error.status === 401)) {
        throw error;
      }
    }

    setState({
      status: "guest",
      user: null,
      session: null,
      security: null,
      csrfToken: null,
      mfaChallenge: null,
      errorMessage: null,
    });
  }, [state.csrfToken]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      ...state,
      signIn,
      verifyMfa,
      cancelMfa,
      signOut,
      refreshSession: () => refreshSession(),
    }),
    [cancelMfa, refreshSession, signIn, signOut, state, verifyMfa],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
