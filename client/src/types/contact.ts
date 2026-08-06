export type ContactCategory =
  | "general"
  | "bug"
  | "content"
  | "account"
  | "feedback";

export type ContactConversationStatus =
  | "new"
  | "in-review"
  | "resolved";

export type ContactSenderRole = "user" | "admin";

export interface ContactComposerDraft {
  category: ContactCategory;
  name: string;
  email: string;
  subject: string;
  message: string;
  nameTouched: boolean;
  emailTouched: boolean;
}

export interface ContactSubmissionInput {
  category: ContactCategory;
  name: string;
  email: string;
  subject: string;
  message: string;
  companyWebsite: string;
}

export interface ContactSubmissionResponse {
  status: "success";
  code: "CONTACT_MESSAGE_ACCEPTED";
  message: string;
  referenceId: string;
  submittedAt: string;
  linkedToAccount: boolean;
}

export interface ContactConversationSummary {
  referenceId: string;
  category: ContactCategory;
  subject: string;
  status: ContactConversationStatus;
  preview: string;
  messageCount: number;
  lastSenderRole: ContactSenderRole;
  lastMessageAt: string;
  createdAt: string;
}

export interface ContactConversationMessage {
  id: string;
  senderRole: ContactSenderRole;
  body: string;
  createdAt: string;
}

export interface ContactConversationDetails {
  conversation: ContactConversationSummary & {
    updatedAt: string;
  };
  messages: ContactConversationMessage[];
}

export interface ContactConversationListResponse {
  status: "success";
  code: "CONTACT_CONVERSATIONS_READY";
  conversations: ContactConversationSummary[];
}

export interface ContactConversationResponse
  extends ContactConversationDetails {
  status: "success";
  code: "CONTACT_CONVERSATION_READY";
}

export interface ContactReplyInput {
  message: string;
}

export interface ContactReplyResponse
  extends ContactConversationDetails {
  status: "success";
  code: "CONTACT_REPLY_ADDED";
  message: string;
}

export type ContactFieldName =
  | "category"
  | "name"
  | "email"
  | "subject"
  | "message"
  | "companyWebsite";

export type ContactFieldErrors = Partial<
  Record<ContactFieldName, string[]>
>;
