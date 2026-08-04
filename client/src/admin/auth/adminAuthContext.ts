import { createContext, useContext } from "react";

import type {
  AdminAuthStatus,
  AdminMfaChallengeState,
  AdminSecuritySummary,
  AdminSessionSummary,
  AdminUser,
} from "../types/admin";

export interface AdminAuthContextValue {
  status: AdminAuthStatus;
  user: AdminUser | null;
  session: AdminSessionSummary | null;
  security: AdminSecuritySummary | null;
  csrfToken: string | null;
  mfaChallenge: AdminMfaChallengeState | null;
  errorMessage: string | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  verifyMfa: (input: {
    method: "totp" | "recovery";
    code: string;
  }) => Promise<void>;
  cancelMfa: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const AdminAuthContext =
  createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider.");
  }

  return context;
}
