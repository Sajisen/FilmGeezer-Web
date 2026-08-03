import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AdminApiError,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from "../services/adminService";
import type {
  AdminAuthStatus,
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
  csrfToken: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: AdminAuthState = {
  status: "bootstrapping",
  user: null,
  session: null,
  csrfToken: null,
  errorMessage: null,
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>(INITIAL_STATE);

  const refreshSession = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await getAdminSession(signal);
      setState({
        status: "authenticated",
        user: response.user,
        session: response.session,
        csrfToken: response.csrfToken,
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
          csrfToken: null,
          errorMessage: null,
        });
        return false;
      }

      setState({
        status: "guest",
        user: null,
        session: null,
        csrfToken: null,
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
      setState({
        status: "authenticated",
        user: response.user,
        session: response.session,
        csrfToken: response.csrfToken,
        errorMessage: null,
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    const csrfToken = state.csrfToken;

    if (!csrfToken) {
      setState({
        status: "guest",
        user: null,
        session: null,
        csrfToken: null,
        errorMessage: null,
      });
      return;
    }

    await logoutAdmin(csrfToken);

    setState({
      status: "guest",
      user: null,
      session: null,
      csrfToken: null,
      errorMessage: null,
    });
  }, [state.csrfToken]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      ...state,
      signIn,
      signOut,
      refreshSession: () => refreshSession(),
    }),
    [refreshSession, signIn, signOut, state],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
