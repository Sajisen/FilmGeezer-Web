export interface AdminUser {
  userId: string;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  roles: Array<"user" | "admin">;
}

export interface AdminSessionSummary {
  createdAt: string;
  lastSeenAt: string;
  idleExpiresAt: string;
  expiresAt: string;
}

export interface AdminSessionResponse {
  status: "success";
  code: "ADMIN_SESSION_ACTIVE";
  user: AdminUser;
  session: AdminSessionSummary;
  csrfToken: string;
}

export interface AdminLoginResponse {
  status: "success";
  code: "ADMIN_LOGIN_SUCCEEDED";
  message: string;
  user: AdminUser;
  session: AdminSessionSummary;
  csrfToken: string;
}

export interface AdminOverview {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  support: {
    new: number;
    inReview: number;
    resolved: number;
    spam: number;
    open: number;
  };
  administration: {
    activeAdministrators: number;
    activeAdminSessions: number;
  };
}

export interface AdminOverviewResponse {
  status: "success";
  code: "ADMIN_OVERVIEW_READY";
  overview: AdminOverview;
}

export interface AdminErrorPayload {
  status?: "error";
  code?: string;
  message?: string;
}

export type AdminAuthStatus =
  | "bootstrapping"
  | "guest"
  | "authenticated";