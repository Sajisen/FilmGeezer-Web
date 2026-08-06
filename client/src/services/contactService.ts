import type {
  AuthErrorPayload,
} from "../types/auth";

import type {
  ContactCategory,
  ContactConversationDetails,
  ContactConversationListResponse,
  ContactConversationMessage,
  ContactConversationResponse,
  ContactConversationStatus,
  ContactConversationSummary,
  ContactFieldErrors,
  ContactReplyInput,
  ContactReplyResponse,
  ContactSenderRole,
  ContactSubmissionInput,
  ContactSubmissionResponse,
} from "../types/contact";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CONTACT_CATEGORIES = new Set<ContactCategory>([
  "general",
  "bug",
  "content",
  "account",
  "feedback",
]);

const CONTACT_STATUSES = new Set<ContactConversationStatus>([
  "new",
  "in-review",
  "resolved",
]);

const CONTACT_SENDER_ROLES = new Set<ContactSenderRole>([
  "user",
  "admin",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

function isContactCategory(value: unknown): value is ContactCategory {
  return (
    typeof value === "string" &&
    CONTACT_CATEGORIES.has(value as ContactCategory)
  );
}

function isContactStatus(
  value: unknown,
): value is ContactConversationStatus {
  return (
    typeof value === "string" &&
    CONTACT_STATUSES.has(value as ContactConversationStatus)
  );
}

function isContactSenderRole(
  value: unknown,
): value is ContactSenderRole {
  return (
    typeof value === "string" &&
    CONTACT_SENDER_ROLES.has(value as ContactSenderRole)
  );
}

function isContactResponse(
  value: unknown,
): value is ContactSubmissionResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "CONTACT_MESSAGE_ACCEPTED" &&
    typeof value.message === "string" &&
    typeof value.referenceId === "string" &&
    typeof value.submittedAt === "string" &&
    typeof value.linkedToAccount === "boolean"
  );
}

function isConversationSummary(
  value: unknown,
): value is ContactConversationSummary {
  return (
    isRecord(value) &&
    typeof value.referenceId === "string" &&
    isContactCategory(value.category) &&
    typeof value.subject === "string" &&
    isContactStatus(value.status) &&
    typeof value.preview === "string" &&
    typeof value.messageCount === "number" &&
    Number.isSafeInteger(value.messageCount) &&
    value.messageCount >= 1 &&
    isContactSenderRole(value.lastSenderRole) &&
    typeof value.lastMessageAt === "string" &&
    typeof value.createdAt === "string"
  );
}

function isConversationMessage(
  value: unknown,
): value is ContactConversationMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isContactSenderRole(value.senderRole) &&
    typeof value.body === "string" &&
    typeof value.createdAt === "string"
  );
}

function isConversationDetails(
  value: unknown,
): value is ContactConversationDetails {
  return (
    isRecord(value) &&
    isRecord(value.conversation) &&
    isConversationSummary(value.conversation) &&
    typeof value.conversation.updatedAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isConversationMessage)
  );
}

function isConversationListResponse(
  value: unknown,
): value is ContactConversationListResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "CONTACT_CONVERSATIONS_READY" &&
    Array.isArray(value.conversations) &&
    value.conversations.every(isConversationSummary)
  );
}

function isConversationResponse(
  value: unknown,
): value is ContactConversationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "CONTACT_CONVERSATION_READY" &&
    isConversationDetails(value)
  );
}

function isReplyResponse(value: unknown): value is ContactReplyResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "CONTACT_REPLY_ADDED" &&
    typeof value.message === "string" &&
    isConversationDetails(value)
  );
}

function asErrorPayload(value: unknown): AuthErrorPayload {
  return isRecord(value) ? (value as AuthErrorPayload) : {};
}

function readFieldErrors(value: unknown): ContactFieldErrors {
  if (!isRecord(value) || !isRecord(value.fields)) {
    return {};
  }

  const result: ContactFieldErrors = {};

  for (const field of [
    "category",
    "name",
    "email",
    "subject",
    "message",
    "companyWebsite",
  ] as const) {
    const fieldValue = value.fields[field];

    if (isStringArray(fieldValue)) {
      result[field] = fieldValue;
    }
  }

  return result;
}

function readFormErrors(value: unknown): string[] {
  return isRecord(value) && isStringArray(value.form)
    ? value.form
    : [];
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class ContactApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly fieldErrors: ContactFieldErrors;
  readonly formErrors: string[];

  constructor(input: {
    status: number;
    message: string;
    code?: string | null;
    fieldErrors?: ContactFieldErrors;
    formErrors?: string[];
  }) {
    super(input.message);
    this.name = "ContactApiError";
    this.status = input.status;
    this.code = input.code ?? null;
    this.fieldErrors = input.fieldErrors ?? {};
    this.formErrors = input.formErrors ?? [];
  }
}

async function requestContactApi(
  path: string,
  init: RequestInit,
): Promise<{ response: Response; payload: unknown }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw new ContactApiError({
      status: 0,
      message:
        "FilmGeezer could not reach the support service. Check your connection and try again.",
    });
  }

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    const errorPayload = asErrorPayload(payload);
    const errors = isRecord(errorPayload.errors)
      ? errorPayload.errors
      : null;

    throw new ContactApiError({
      status: response.status,
      code:
        typeof errorPayload.code === "string"
          ? errorPayload.code
          : null,
      message:
        typeof errorPayload.message === "string"
          ? errorPayload.message
          : "FilmGeezer could not complete the support request.",
      fieldErrors: readFieldErrors(errors),
      formErrors: readFormErrors(errors),
    });
  }

  return { response, payload };
}

export async function submitContactMessage(
  input: ContactSubmissionInput,
): Promise<ContactSubmissionResponse> {
  const { response, payload } = await requestContactApi(
    "/api/contact/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!isContactResponse(payload)) {
    throw new ContactApiError({
      status: response.status,
      message: "FilmGeezer received an unexpected support response.",
    });
  }

  return payload;
}

export async function getContactConversations(
  signal?: AbortSignal,
): Promise<ContactConversationListResponse> {
  const { response, payload } = await requestContactApi(
    "/api/contact/conversations",
    {
      method: "GET",
      signal,
    },
  );

  if (!isConversationListResponse(payload)) {
    throw new ContactApiError({
      status: response.status,
      message: "FilmGeezer received an unexpected support-history response.",
    });
  }

  return payload;
}

export async function getContactConversation(
  referenceId: string,
  signal?: AbortSignal,
): Promise<ContactConversationResponse> {
  const { response, payload } = await requestContactApi(
    `/api/contact/conversations/${encodeURIComponent(referenceId)}`,
    {
      method: "GET",
      signal,
    },
  );

  if (!isConversationResponse(payload)) {
    throw new ContactApiError({
      status: response.status,
      message: "FilmGeezer received an unexpected conversation response.",
    });
  }

  return payload;
}

export async function replyToContactConversation(
  referenceId: string,
  input: ContactReplyInput,
  csrfToken: string,
): Promise<ContactReplyResponse> {
  const { response, payload } = await requestContactApi(
    `/api/contact/conversations/${encodeURIComponent(referenceId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(input),
    },
  );

  if (!isReplyResponse(payload)) {
    throw new ContactApiError({
      status: response.status,
      message: "FilmGeezer received an unexpected reply response.",
    });
  }

  return payload;
}
