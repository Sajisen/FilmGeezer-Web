import { createContext, useContext } from "react";

import type {
  AdminAuthStatus,
  AdminSessionSummary,
  AdminUser,
} from "../types/admin";

export interface AdminAuthContextValue {
  status: AdminAuthStatus;
  user: AdminUser | null;
  session: AdminSessionSummary | null;
  csrfToken: string | null;
  errorMessage: string | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
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