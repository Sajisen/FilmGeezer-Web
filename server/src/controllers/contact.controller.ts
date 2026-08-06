import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AuthPersistenceError,
  AuthSessionRequiredError,
} from "../features/auth/auth.errors.js";

import {
  clearAuthSessionCookie,
  readAuthSessionToken,
} from "../features/auth/auth.session.js";

import {
  resolveAuthenticatedSession,
} from "../features/auth/auth.session.service.js";

import {
  ContactConversationMessageLimitError,
  ContactConversationNotFoundError,
  ContactPersistenceError,
} from "../features/contact/contact.errors.js";

import {
  getContactConversationThread,
  getRecentContactConversations,
  replyToContactConversation,
  submitContactMessage,
} from "../features/contact/contact.service.js";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

import type {
  ContactConversationSummary,
  ContactConversationThread,
} from "../features/contact/contact.types.js";

async function resolveOptionalContactUserId(
  request: Request,
  response: Response,
) {
  const sessionToken = readAuthSessionToken(request);

  if (!sessionToken) {
    return undefined;
  }

  try {
    const context = await resolveAuthenticatedSession(sessionToken);
    return context.userId;
  } catch (error) {
    if (error instanceof AuthSessionRequiredError) {
      clearAuthSessionCookie(response);
      return undefined;
    }

    if (error instanceof AuthPersistenceError) {
      console.warn(
        "[contact] Optional account context could not be resolved.",
        {
          name: error.name,
          code: error.code,
        },
      );
      return undefined;
    }

    throw error;
  }
}

function serializeConversationSummary(
  conversation: ContactConversationSummary,
) {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt.toISOString(),
  };
}

function serializeConversationThread(
  thread: ContactConversationThread,
) {
  return {
    conversation: {
      ...serializeConversationSummary(thread.conversation),
      updatedAt: thread.conversation.updatedAt.toISOString(),
    },
    messages: thread.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

function sendValidationError(
  response: Response,
  error: z.ZodError,
): void {
  const flattened = error.flatten();

  response.status(400).json({
    status: "error",
    code: "CONTACT_INVALID_INPUT",
    message: "Check the support-request details and try again.",
    errors: {
      form: flattened.formErrors,
      fields: flattened.fieldErrors,
    },
  });
}

function sendPersistenceError(
  response: Response,
  message: string,
): void {
  response.status(503).json({
    status: "error",
    code: "CONTACT_TEMPORARILY_UNAVAILABLE",
    message,
  });
}

export async function createContactMessage(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const accountUserId = await resolveOptionalContactUserId(
      request,
      response,
    );

    const result = await submitContactMessage(
      request.body,
      accountUserId,
    );

    response.status(202).json({
      status: "success",
      code: "CONTACT_MESSAGE_ACCEPTED",
      message:
        "Your message was received. Keep the reference number if you need to follow up.",
      referenceId: result.referenceId,
      submittedAt: result.submittedAt.toISOString(),
      linkedToAccount: result.linkedToAccount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof ContactPersistenceError) {
      console.error("[contact] Message storage failed.", {
        name: error.name,
        code: error.code,
      });

      sendPersistenceError(
        response,
        "FilmGeezer cannot receive messages right now. Please try again shortly.",
      );
      return;
    }

    next(error);
  }
}

export async function getCurrentContactConversations(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const conversations = await getRecentContactConversations(auth.userId);

    response.status(200).json({
      status: "success",
      code: "CONTACT_CONVERSATIONS_READY",
      conversations: conversations.map(serializeConversationSummary),
    });
  } catch (error) {
    if (error instanceof ContactPersistenceError) {
      sendPersistenceError(
        response,
        "Your recent support requests cannot be loaded right now.",
      );
      return;
    }

    next(error);
  }
}

export async function getCurrentContactConversation(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const thread = await getContactConversationThread(
      auth.userId,
      request.params.referenceId,
    );

    response.status(200).json({
      status: "success",
      code: "CONTACT_CONVERSATION_READY",
      ...serializeConversationThread(thread),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof ContactConversationNotFoundError) {
      response.status(404).json({
        status: "error",
        code: error.code,
        message: error.message,
      });
      return;
    }

    if (error instanceof ContactPersistenceError) {
      sendPersistenceError(
        response,
        "The support conversation cannot be loaded right now.",
      );
      return;
    }

    next(error);
  }
}

export async function createCurrentContactConversationReply(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const thread = await replyToContactConversation(
      auth.userId,
      request.params.referenceId,
      request.body,
    );

    response.status(201).json({
      status: "success",
      code: "CONTACT_REPLY_ADDED",
      message: "Your reply was added to the support request.",
      ...serializeConversationThread(thread),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof ContactConversationNotFoundError) {
      response.status(404).json({
        status: "error",
        code: error.code,
        message: error.message,
      });
      return;
    }

    if (error instanceof ContactConversationMessageLimitError) {
      response.status(409).json({
        status: "error",
        code: error.code,
        message: error.message,
      });
      return;
    }

    if (error instanceof ContactPersistenceError) {
      sendPersistenceError(
        response,
        "Your reply cannot be saved right now. Please try again shortly.",
      );
      return;
    }

    next(error);
  }
}
