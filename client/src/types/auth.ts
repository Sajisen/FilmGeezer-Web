export type AuthProvider = "local" | "clerk";

export type AuthRole = "user" | "admin";

export interface AuthUser {
  userId: string;
  provider: AuthProvider;
  email: string;
  displayName: string;
  roles: AuthRole[];
}

export interface AuthSessionSummary {
  createdAt?: string;
  lastSeenAt?: string;
  idleExpiresAt?: string;
  expiresAt: string;
}

export interface AuthVerificationReceipt {
  challengeId: string;
  expiresAt: string | null;
  resendAvailableAt: string | null;
}

export interface AuthRegistrationResponse {
  status: "success";
  code: "AUTH_REGISTRATION_ACCEPTED";
  message: string;
  verification: AuthVerificationReceipt;
}

export interface AuthLoginResponse {
  status: "success";
  code: "AUTH_LOGIN_SUCCEEDED";
  message: string;
  user: AuthUser;
  session: AuthSessionSummary;
}

export interface AuthEmailVerificationResponse {
  status: "success";
  code: "AUTH_EMAIL_VERIFIED";
  message: string;
  verifiedAt: string;
  user: AuthUser;
  session: AuthSessionSummary;
}

export interface AuthVerificationResendResponse {
  status: "success";
  code: "AUTH_VERIFICATION_RESEND_ACCEPTED";
  message: string;
  verification: AuthVerificationReceipt;
}

export interface AuthSessionResponse {
  status: "success";
  code: "AUTH_SESSION_ACTIVE";
  user: AuthUser;
  session: Required<AuthSessionSummary>;
  csrfToken: string;
}

export interface AuthLogoutResponse {
  status: "success";
  code:
    | "AUTH_LOGOUT_SUCCEEDED"
    | "AUTH_LOGOUT_ALL_SUCCEEDED";
  message: string;
  sessionsRevoked: number;
}

export interface AuthFieldErrorPayload {
  form?: string[];
  fields?: Record<string, string[] | undefined>;
}

export interface AuthErrorPayload {
  status?: "error";
  code?: string;
  message?: string;
  errors?: AuthFieldErrorPayload;
  password?: {
    reason?: string;
  };
  verification?: Partial<AuthVerificationReceipt>;
  retryAt?: string | null;
  attemptsRemaining?: number | null;
}

export type AuthStateStatus =
  | "loading"
  | "guest"
  | "authenticated";

export interface AuthPasswordResetRequestResponse {
  status: "success";
  code: "AUTH_PASSWORD_RESET_REQUEST_ACCEPTED";
  message: string;
  acceptedAt: string;
}

export interface AuthPasswordResetResponse {
  status: "success";
  code: "AUTH_PASSWORD_RESET_COMPLETED";
  message: string;
  resetAt: string;
  sessionsRevoked: number;
}
