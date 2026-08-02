import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AuthApiError,
  getCurrentAuthSession,
  logoutAllSessions,
  logoutCurrentSession,
} from "../../services/authService";

import type {
  AuthSessionSummary,
  AuthStateStatus,
  AuthUser,
} from "../../types/auth";

import {
  AuthContext,
  type AuthContextValue,
} from "./authContext";

interface AuthProviderProps {
  children: ReactNode;
}

interface InternalAuthState {
  status: AuthStateStatus;
  user: AuthUser | null;
  session: AuthSessionSummary | null;
  csrfToken: string | null;
  bootstrapError: string | null;
}

const INITIAL_AUTH_STATE: InternalAuthState = {
  status: "loading",
  user: null,
  session: null,
  csrfToken: null,
  bootstrapError: null,
};

function createGuestState(
  bootstrapError: string | null = null,
): InternalAuthState {
  return {
    status: "guest",
    user: null,
    session: null,
    csrfToken: null,
    bootstrapError,
  };
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [state, setState] =
    useState<InternalAuthState>(
      INITIAL_AUTH_STATE,
    );

  const csrfTokenRef =
    useRef<string | null>(null);

  useEffect(() => {
    csrfTokenRef.current =
      state.csrfToken;
  }, [state.csrfToken]);

  const loadSession = useCallback(
    async (
      signal?: AbortSignal,
    ): Promise<boolean> => {
      try {
        const response =
          await getCurrentAuthSession(
            signal,
          );

        if (signal?.aborted) {
          return false;
        }

        csrfTokenRef.current =
          response.csrfToken;

        setState({
          status: "authenticated",
          user: response.user,
          session: response.session,
          csrfToken:
            response.csrfToken,
          bootstrapError: null,
        });

        return true;
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name === "AbortError"
        ) {
          return false;
        }

        if (signal?.aborted) {
          return false;
        }

        csrfTokenRef.current = null;

        if (
          error instanceof
            AuthApiError &&
          error.status === 401
        ) {
          setState(
            createGuestState(),
          );

          return false;
        }

        setState(
          createGuestState(
            error instanceof Error
              ? error.message
              : "FilmGeezer could not check your sign-in status.",
          ),
        );

        return false;
      }
    },
    [],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    /*
     * Session bootstrapping synchronises React with the browser's
     * HttpOnly cookie and the server-side session store. Scheduling the
     * async request outside the effect's synchronous body avoids a
     * cascading render while preserving cancellation on unmount.
     */
    const bootstrapTimer =
      window.setTimeout(() => {
        void loadSession(
          controller.signal,
        );
      }, 0);

    return () => {
      window.clearTimeout(
        bootstrapTimer,
      );

      controller.abort();
    };
  }, [loadSession]);

  const refreshSession =
    useCallback(async () => {
      return loadSession();
    }, [loadSession]);

  const completeAuthentication =
    useCallback(async () => {
      /*
       * Login and email verification set the opaque HttpOnly cookie.
       * Reading the session immediately afterwards gives React the safe
       * user DTO and the in-memory CSRF token.
       */
      return loadSession();
    }, [loadSession]);

  const updateUser = useCallback(
    (
      updates: Partial<
        Pick<
          AuthUser,
          "displayName" | "email" | "profileImagePath"
        >
      >,
    ) => {
      setState((current) =>
        current.user
          ? {
              ...current,
              user: {
                ...current.user,
                ...updates,
              },
            }
          : current,
      );
    },
    [],
  );

  const getUsableCsrfToken =
    useCallback(async () => {
      if (csrfTokenRef.current) {
        return csrfTokenRef.current;
      }

      const refreshed =
        await loadSession();

      if (
        !refreshed ||
        !csrfTokenRef.current
      ) {
        throw new Error(
          "Your FilmGeezer session is no longer available.",
        );
      }

      return csrfTokenRef.current;
    }, [loadSession]);

  const signOut =
    useCallback(async () => {
      const csrfToken =
        await getUsableCsrfToken();

      await logoutCurrentSession(
        csrfToken,
      );

      csrfTokenRef.current = null;
      setState(createGuestState());
    }, [getUsableCsrfToken]);

  const signOutAll =
    useCallback(async () => {
      const csrfToken =
        await getUsableCsrfToken();

      await logoutAllSessions(
        csrfToken,
      );

      csrfTokenRef.current = null;
      setState(createGuestState());
    }, [getUsableCsrfToken]);

  const contextValue =
    useMemo<AuthContextValue>(
      () => ({
        status: state.status,
        user: state.user,
        session: state.session,
        csrfToken:
          state.csrfToken,
        bootstrapError:
          state.bootstrapError,

        refreshSession,
        completeAuthentication,
        updateUser,

        signOut,
        signOutAll,
      }),
      [
        completeAuthentication,
        refreshSession,
        signOut,
        signOutAll,
        state.bootstrapError,
        state.csrfToken,
        state.session,
        state.status,
        state.user,
        updateUser,
      ],
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}