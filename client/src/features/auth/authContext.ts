import { createContext, useContext } from "react";

import type {
  AuthSessionSummary,
  AuthStateStatus,
  AuthUser,
} from "../../types/auth";

export interface AuthContextValue {
  status: AuthStateStatus;
  user: AuthUser | null;
  session: AuthSessionSummary | null;
  csrfToken: string | null;
  bootstrapError: string | null;

  refreshSession: () => Promise<boolean>;
  completeAuthentication: () => Promise<boolean>;

  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
