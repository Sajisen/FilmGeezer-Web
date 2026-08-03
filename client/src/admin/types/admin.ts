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

export type AdminSupportCategory =
  | "general"
  | "bug"
  | "content"
  | "account"
  | "feedback";

export type AdminSupportStatus =
  | "new"
  | "in-review"
  | "resolved"
  | "spam";

export type AdminSupportSenderRole = "user" | "admin";

export type AdminSupportStatusFilter =
  | "all"
  | "open"
  | AdminSupportStatus;

export type AdminSupportRequesterFilter =
  | "all"
  | "account"
  | "guest";

export interface AdminSupportRequester {
  userId: string | null;
  name: string;
  email: string;
  linkedToAccount: boolean;
}

export interface AdminSupportConversationSummary {
  referenceId: string;
  category: AdminSupportCategory;
  subject: string;
  status: AdminSupportStatus;
  preview: string;
  messageCount: number;
  lastSenderRole: AdminSupportSenderRole;
  lastMessageAt: string;
  createdAt: string;
  requester: AdminSupportRequester;
}

export interface AdminSupportConversationThread {
  conversation: AdminSupportConversationSummary & {
    updatedAt: string;
    resolvedAt: string | null;
  };
  messages: Array<{
    id: string;
    senderRole: AdminSupportSenderRole;
    body: string;
    createdAt: string;
  }>;
  delivery: {
    channel: "in-app" | "email";
    available: boolean;
    message: string;
  };
}

export interface AdminSupportListResponse {
  status: "success";
  code: "ADMIN_SUPPORT_CONVERSATIONS_READY";
  items: AdminSupportConversationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminSupportThreadResponse {
  status: "success";
  code: "ADMIN_SUPPORT_CONVERSATION_READY";
  thread: AdminSupportConversationThread;
}

export interface AdminSupportMutationResponse {
  status: "success";
  code:
    | "ADMIN_SUPPORT_REPLY_ADDED"
    | "ADMIN_SUPPORT_STATUS_UPDATED";
  message: string;
  thread: AdminSupportConversationThread;
}

export interface AdminSupportListFilters {
  page: number;
  status: AdminSupportStatusFilter;
  category: "all" | AdminSupportCategory;
  requester: AdminSupportRequesterFilter;
  search: string;
}
