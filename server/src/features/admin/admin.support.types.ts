import type {
  ContactCategory,
  ContactMessageStatus,
  ContactSenderRole,
} from "../contact/contact.types.js";

export const ADMIN_SUPPORT_STATUS_FILTER_VALUES = [
  "all",
  "open",
  "new",
  "in-review",
  "resolved",
  "spam",
] as const;

export const ADMIN_SUPPORT_REQUESTER_FILTER_VALUES = [
  "all",
  "account",
  "guest",
] as const;

export type AdminSupportStatusFilter =
  (typeof ADMIN_SUPPORT_STATUS_FILTER_VALUES)[number];

export type AdminSupportRequesterFilter =
  (typeof ADMIN_SUPPORT_REQUESTER_FILTER_VALUES)[number];

export interface AdminSupportListQuery {
  page: number;
  pageSize: number;
  status: AdminSupportStatusFilter;
  category: "all" | ContactCategory;
  requester: AdminSupportRequesterFilter;
  search: string;
}

export interface AdminSupportRequester {
  userId: string | null;
  name: string;
  email: string;
  linkedToAccount: boolean;
}

export interface AdminSupportConversationSummary {
  referenceId: string;
  category: ContactCategory;
  subject: string;
  status: ContactMessageStatus;
  preview: string;
  messageCount: number;
  lastSenderRole: ContactSenderRole;
  lastMessageAt: Date;
  createdAt: Date;
  requester: AdminSupportRequester;
}

export interface AdminSupportConversationThread {
  conversation: AdminSupportConversationSummary & {
    updatedAt: Date;
    resolvedAt: Date | null;
  };
  messages: Array<{
    id: string;
    senderRole: ContactSenderRole;
    body: string;
    createdAt: Date;
  }>;
  delivery: {
    channel: "in-app" | "email";
    available: boolean;
    message: string;
  };
}

export interface AdminSupportListResult {
  items: AdminSupportConversationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
