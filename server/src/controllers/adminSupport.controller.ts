import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AdminSupportConversationNotFoundError,
  AdminSupportGuestReplyUnavailableError,
  AdminSupportMessageLimitError,
  AdminSupportPersistenceError,
  AdminSupportSpamReplyBlockedError,
} from "../features/admin/admin.support.errors.js";
import {
  changeAdminSupportStatus,
  getAdminSupportConversation,
  listAdminSupportConversations,
  replyToAdminSupportConversation,
} from "../features/admin/admin.support.service.js";
import { getAdminContext } from "../middleware/admin.middleware.js";

function serializeSummary(item: Awaited<
  ReturnType<typeof listAdminSupportConversations>
>["items"][number]) {
  return {
    ...item,
    lastMessageAt: item.lastMessageAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  };
}

function serializeThread(
  thread: Awaited<ReturnType<typeof getAdminSupportConversation>>,
) {
  return {
    ...thread,
    conversation: {
      ...serializeSummary(thread.conversation),
      updatedAt: thread.conversation.updatedAt.toISOString(),
      resolvedAt: thread.conversation.resolvedAt?.toISOString() ?? null,
    },
    messages: thread.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

function sendSupportError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      status: "error",
      code: "ADMIN_SUPPORT_VALIDATION_FAILED",
      message: error.issues[0]?.message ?? "The support request is invalid.",
    });
    return true;
  }

  if (error instanceof AdminSupportConversationNotFoundError) {
    response.status(404).json({
      status: "error",
      code: "ADMIN_SUPPORT_NOT_FOUND",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminSupportGuestReplyUnavailableError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_SUPPORT_GUEST_DELIVERY_UNAVAILABLE",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminSupportMessageLimitError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_SUPPORT_MESSAGE_LIMIT_REACHED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminSupportSpamReplyBlockedError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_SUPPORT_SPAM_REPLY_BLOCKED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminSupportPersistenceError) {
    response.status(503).json({
      status: "error",
      code: "ADMIN_SUPPORT_TEMPORARILY_UNAVAILABLE",
      message: error.message,
    });
    return true;
  }

  return false;
}

export async function getAdminSupportInbox(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listAdminSupportConversations({
      page: typeof request.query.page === "string" ? request.query.page : undefined,
      pageSize:
        typeof request.query.pageSize === "string"
          ? request.query.pageSize
          : undefined,
      status:
        typeof request.query.status === "string"
          ? request.query.status
          : undefined,
      category:
        typeof request.query.category === "string"
          ? request.query.category
          : undefined,
      requester:
        typeof request.query.requester === "string"
          ? request.query.requester
          : undefined,
      search:
        typeof request.query.search === "string"
          ? request.query.search
          : undefined,
    });

    response.status(200).json({
      status: "success",
      code: "ADMIN_SUPPORT_CONVERSATIONS_READY",
      items: result.items.map(serializeSummary),
      pagination: result.pagination,
    });
  } catch (error) {
    if (!sendSupportError(error, response)) {
      next(error);
    }
  }
}

export async function getAdminSupportThread(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await getAdminSupportConversation(
      request.params.referenceId,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_SUPPORT_CONVERSATION_READY",
      thread: serializeThread(thread),
    });
  } catch (error) {
    if (!sendSupportError(error, response)) {
      next(error);
    }
  }
}

export async function postAdminSupportReply(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await replyToAdminSupportConversation(
      getAdminContext(request),
      request.params.referenceId,
      request.body,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_SUPPORT_REPLY_ADDED",
      message: "The administrator reply was added to the support request.",
      thread: serializeThread(thread),
    });
  } catch (error) {
    if (!sendSupportError(error, response)) {
      next(error);
    }
  }
}

export async function patchAdminSupportStatus(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await changeAdminSupportStatus(
      getAdminContext(request),
      request.params.referenceId,
      request.body,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_SUPPORT_STATUS_UPDATED",
      message: "The support-request status was updated.",
      thread: serializeThread(thread),
    });
  } catch (error) {
    if (!sendSupportError(error, response)) {
      next(error);
    }
  }
}
