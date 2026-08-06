import { createHash } from "node:crypto";

import {
  MongoServerError,
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import {
  getTmdbCatalog,
  getTmdbMediaDetails,
  TmdbRequestError,
} from "../../services/tmdb.service.js";
import type { MediaDetails, MediaItem } from "../../types/media.js";
import {
  sanitizeFileSize,
  sanitizeTelegramUrl,
} from "../contentLinks/contentLinks.service.js";
import type { AdminRequestMetadata } from "./admin.auth.service.js";
import {
  AdminContentNotFoundError,
  AdminContentPersistenceError,
  AdminContentStateConflictError,
  AdminContentTmdbNotFoundError,
} from "./admin.content.errors.js";
import {
  findAdminContentDocument,
  findAdminContentDocuments,
  insertAdminContentDocument,
  updateAdminContentStatus,
  updateAdminMovieContentDocument,
  updateAdminSeriesContentDocument,
} from "./admin.content.repository.js";
import type {
  AdminContentDetail,
  AdminContentLinksDocument,
  AdminContentListResult,
  AdminContentMediaSnapshot,
  AdminContentMediaType,
  AdminContentMovieQuality,
  AdminContentMovieSource,
  AdminContentSaveInput,
  AdminContentSeriesOption,
  AdminContentStatusInput,
  AdminContentSummary,
  AdminContentTmdbSearchResult,
} from "./admin.content.types.js";
import {
  adminContentListQuerySchema,
  adminContentMediaTypeSchema,
  adminContentSaveSchema,
  adminContentStatusSchema,
  adminContentTmdbIdSchema,
  adminContentTmdbSearchQuerySchema,
} from "./admin.content.validation.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import { createAdminAuditEvent } from "./admin.repository.js";
import {
  hashAdminIpAddress,
  summarizeAdminUserAgent,
} from "./admin.session.js";
import type {
  AdminAuditEvent,
  AdminSessionContext,
} from "./admin.types.js";

const ADMIN_CONTENT_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

const MOVIE_QUALITIES: AdminContentMovieQuality[] = ["720p", "1080p"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeRevisionValue(value: unknown): unknown {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }

  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalizeRevisionValue);
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort((first, second) => first.localeCompare(second))
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalizeRevisionValue(value[key]);
        return result;
      }, {});
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return null;
}

function createRevisionToken(
  document: AdminContentLinksDocument | null,
  mediaType: AdminContentMediaType,
  tmdbId: number,
): string {
  const state = document
    ? {
        exists: true,
        documentId: document._id,
        mediaType: document.media_type,
        tmdbId: document.tmdb_id,
        active: document.active,
        kind: document.kind ?? null,
        title: document.title ?? null,
        year: document.year ?? null,
        updatedAt: document.updated_at ?? null,
        link: document.link ?? null,
        linkOptions: document.link_options ?? null,
        links: document.links ?? null,
        movieSources: document.movie_sources ?? null,
        adminRevision: document.admin_revision ?? null,
        adminUpdatedAt: document.admin_updated_at ?? null,
      }
    : {
        exists: false,
        mediaType,
        tmdbId,
      };

  return createHash("sha256")
    .update(JSON.stringify(canonicalizeRevisionValue(state)))
    .digest("hex");
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeYear(value: unknown): string {
  if (typeof value === "number" && Number.isInteger(value)) {
    return String(value);
  }

  const text = getNonEmptyString(value);
  return text?.slice(0, 12) ?? "Unknown";
}

function parseRevision(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
}

function getDocumentUpdatedAt(
  document: AdminContentLinksDocument,
): Date | null {
  return (
    parseDate(document.admin_updated_at) ?? parseDate(document.updated_at)
  );
}

function getDocumentTitle(document: AdminContentLinksDocument): string {
  return (
    getNonEmptyString(document.title) ??
    (document.media_type === "movie" ? "Untitled movie" : "Untitled series")
  );
}

function getQualityLink(value: unknown) {
  if (typeof value === "string") {
    const url = sanitizeTelegramUrl(value);
    return url ? { url, size: null } : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const url = sanitizeTelegramUrl(value.url);

  if (!url) {
    return null;
  }

  return {
    url,
    size: sanitizeFileSize(value.size) ?? null,
  };
}

function toSeriesOptions(
  document: AdminContentLinksDocument,
): AdminContentSeriesOption[] {
  const rawOptions = Array.isArray(document.link_options)
    ? document.link_options
    : [];
  const options: AdminContentSeriesOption[] = [];

  rawOptions.forEach((value, index) => {
    if (!isRecord(value)) {
      return;
    }

    const url = sanitizeTelegramUrl(value.url ?? value.link);

    if (!url) {
      return;
    }

    options.push({
      id:
        getNonEmptyString(value.id)?.replace(/[^A-Za-z0-9_-]/gu, "") ||
        `series-option-${index + 1}`,
      url,
      isMain: value.is_main === true,
      active: value.active !== false,
    });
  });

  const legacyLink = sanitizeTelegramUrl(document.link);

  if (
    legacyLink &&
    !options.some((option) => option.url === legacyLink)
  ) {
    options.unshift({
      id: "series-legacy-main",
      url: legacyLink,
      isMain: true,
      active: true,
    });
  }

  if (options.length > 0 && !options.some((option) => option.isMain)) {
    const firstActive = options.find((option) => option.active) ?? options[0];
    firstActive.isMain = true;
  }

  return options;
}

function toMovieSources(
  document: AdminContentLinksDocument,
): AdminContentMovieSource[] {
  const rawSources = Array.isArray(document.movie_sources)
    ? document.movie_sources
    : [];
  const sources: AdminContentMovieSource[] = [];

  rawSources.forEach((value, index) => {
    if (!isRecord(value)) {
      return;
    }

    const rawLinks = isRecord(value.links) ? value.links : {};
    const links = {
      "720p": getQualityLink(rawLinks["720p"]),
      "1080p": getQualityLink(rawLinks["1080p"]),
    };

    if (!links["720p"] && !links["1080p"]) {
      return;
    }

    sources.push({
      id:
        getNonEmptyString(value.id)?.replace(/[^A-Za-z0-9_-]/gu, "") ||
        `movie-source-${index + 1}`,
      isMain: value.is_main === true,
      active: value.active !== false,
      links,
    });
  });

  const legacyLinks = isRecord(document.links) ? document.links : {};
  const legacySource: AdminContentMovieSource = {
    id: "movie-legacy-main",
    isMain: true,
    active: true,
    links: {
      "720p": getQualityLink(legacyLinks["720p"]),
      "1080p": getQualityLink(legacyLinks["1080p"]),
    },
  };

  if (
    (legacySource.links["720p"] || legacySource.links["1080p"]) &&
    !sources.some((source) =>
      MOVIE_QUALITIES.some(
        (quality) =>
          source.links[quality]?.url === legacySource.links[quality]?.url &&
          legacySource.links[quality] !== null,
      ),
    )
  ) {
    sources.unshift(legacySource);
  }

  if (sources.length > 0 && !sources.some((source) => source.isMain)) {
    const firstActive = sources.find((source) => source.active) ?? sources[0];
    firstActive.isMain = true;
  }

  return sources;
}

function countContentLinks(document: AdminContentLinksDocument): {
  sourceCount: number;
  linkCount: number;
} {
  if (document.media_type === "tv") {
    const options = toSeriesOptions(document);
    return {
      sourceCount: options.length,
      linkCount: options.filter((option) => option.active).length,
    };
  }

  const sources = toMovieSources(document);
  return {
    sourceCount: sources.length,
    linkCount: sources.reduce(
      (total, source) =>
        source.active
          ? total +
            MOVIE_QUALITIES.filter((quality) => source.links[quality]).length
          : total,
      0,
    ),
  };
}

function toSummary(
  document: AdminContentLinksDocument,
): AdminContentSummary {
  const counts = countContentLinks(document);

  return {
    mediaType: document.media_type,
    tmdbId: document.tmdb_id,
    kind: document.media_type === "movie" ? "movie" : "series",
    title: getDocumentTitle(document),
    year: normalizeYear(document.year),
    active: document.active === true,
    sourceCount: counts.sourceCount,
    linkCount: counts.linkCount,
    revision: parseRevision(document.admin_revision),
    updatedAt: getDocumentUpdatedAt(document),
  };
}

function toMediaSnapshot(item: MediaItem): AdminContentMediaSnapshot {
  return {
    mediaType: item.mediaType,
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    rating: item.rating,
    posterUrl: item.posterUrl || null,
    backdropUrl: item.backdropUrl || null,
    overview: item.overview,
  };
}

function toMediaDetailsSnapshot(
  details: MediaDetails,
): AdminContentMediaSnapshot {
  return toMediaSnapshot(details);
}

function createStoredMediaSnapshot(
  document: AdminContentLinksDocument,
): AdminContentMediaSnapshot {
  return {
    mediaType: document.media_type,
    tmdbId: document.tmdb_id,
    title: getDocumentTitle(document),
    year: normalizeYear(document.year),
    rating: 0,
    posterUrl: null,
    backdropUrl: null,
    overview:
      "TMDB details are temporarily unavailable. Stored FilmGeezer link data remains available for administration.",
  };
}

async function loadMediaSnapshot(
  mediaType: AdminContentMediaType,
  tmdbId: number,
  existingDocument: AdminContentLinksDocument | null,
): Promise<AdminContentMediaSnapshot> {
  try {
    const details = await getTmdbMediaDetails(mediaType, tmdbId);
    return toMediaDetailsSnapshot(details);
  } catch (error) {
    if (existingDocument) {
      return createStoredMediaSnapshot(existingDocument);
    }

    if (error instanceof TmdbRequestError && error.status === 404) {
      throw new AdminContentTmdbNotFoundError();
    }

    throw error;
  }
}

function toDetail(
  media: AdminContentMediaSnapshot,
  document: AdminContentLinksDocument | null,
): AdminContentDetail {
  return {
    media,
    exists: document !== null,
    active: document?.active === true || document === null,
    kind: media.mediaType === "movie" ? "movie" : "series",
    revision: document ? parseRevision(document.admin_revision) : 0,
    revisionToken: createRevisionToken(
      document,
      media.mediaType,
      media.tmdbId,
    ),
    updatedAt: document ? getDocumentUpdatedAt(document) : null,
    seriesOptions:
      document?.media_type === "tv" ? toSeriesOptions(document) : [],
    movieSources:
      document?.media_type === "movie" ? toMovieSources(document) : [],
  };
}

function createAuditMetadata(requestMetadata: AdminRequestMetadata) {
  return {
    ipHash: hashAdminIpAddress(requestMetadata.ipAddress),
    userAgentSummary: summarizeAdminUserAgent(requestMetadata.userAgent),
  };
}

function actionFailureReason(error: unknown): string {
  if (error instanceof AdminContentStateConflictError) {
    return "revision-conflict";
  }

  if (error instanceof AdminContentNotFoundError) {
    return "content-not-found";
  }

  if (error instanceof AdminContentTmdbNotFoundError) {
    return "tmdb-title-not-found";
  }

  return "persistence-failure";
}

async function recordFailedAction(input: {
  eventType: AdminAuditEvent;
  administrator: AdminSessionContext;
  mediaType: AdminContentMediaType;
  tmdbId: number;
  requestMetadata: AdminRequestMetadata;
  error: unknown;
}): Promise<void> {
  const metadata = createAuditMetadata(input.requestMetadata);

  try {
    await createAdminAuditEvent({
      auditEventId: new ObjectId(),
      actorUserId: input.administrator.userId,
      eventType: input.eventType,
      outcome: "failure",
      ipHash: metadata.ipHash,
      userAgentSummary: metadata.userAgentSummary,
      details: {
        mediaType: input.mediaType,
        tmdbId: input.tmdbId,
        reason: actionFailureReason(input.error),
      },
      createdAt: new Date(),
    });
  } catch (auditError) {
    console.error("[admin-content] Failed action audit could not be recorded.", {
      name:
        auditError instanceof Error ? auditError.name : "UnknownError",
    });
  }
}

function isKnownContentError(error: unknown): boolean {
  return (
    error instanceof AdminContentNotFoundError ||
    error instanceof AdminContentTmdbNotFoundError ||
    error instanceof AdminContentStateConflictError ||
    error instanceof AdminContentPersistenceError ||
    error instanceof TmdbRequestError
  );
}

function getSourcePage(
  existingDocument: AdminContentLinksDocument | null,
  sourceId: string,
  quality: AdminContentMovieQuality,
  allowLegacyTopLevel: boolean,
): string | null {
  const rawSources = Array.isArray(existingDocument?.movie_sources)
    ? existingDocument.movie_sources
    : [];

  const source = rawSources.find(
    (value) =>
      isRecord(value) && getNonEmptyString(value.id) === sourceId,
  );

  if (isRecord(source) && isRecord(source.links)) {
    const qualityValue = source.links[quality];

    if (isRecord(qualityValue)) {
      const sourcePage = getNonEmptyString(qualityValue.source_page);
      if (sourcePage) {
        return sourcePage;
      }
    }
  }

  if (allowLegacyTopLevel && isRecord(existingDocument?.links)) {
    const qualityValue = existingDocument.links[quality];

    if (isRecord(qualityValue)) {
      return getNonEmptyString(qualityValue.source_page);
    }
  }

  return null;
}

function buildPersistedMovieSources(
  input: Extract<AdminContentSaveInput, { kind: "movie" }>,
  existingDocument: AdminContentLinksDocument | null,
) {
  return input.sources.map((source) => {
    const links: Record<string, unknown> = {};

    MOVIE_QUALITIES.forEach((quality) => {
      const link = source.links[quality];

      if (!link) {
        return;
      }

      const sourcePage = getSourcePage(
        existingDocument,
        source.id,
        quality,
        source.isMain,
      );

      links[quality] = {
        label: quality,
        ...(link.size ? { size: link.size } : {}),
        url: link.url,
        ...(sourcePage ? { source_page: sourcePage } : {}),
      };
    });

    return {
      id: source.id,
      links,
      is_main: source.isMain,
      active: source.active,
    };
  });
}

function getCurrentRevision(
  document: AdminContentLinksDocument | null,
): number {
  return document ? parseRevision(document.admin_revision) : 0;
}

function assertExpectedState(
  document: AdminContentLinksDocument | null,
  input: {
    mediaType: AdminContentMediaType;
    tmdbId: number;
    expectedRevision: number;
    expectedRevisionToken: string;
  },
): void {
  const currentRevision = getCurrentRevision(document);
  const currentRevisionToken = createRevisionToken(
    document,
    input.mediaType,
    input.tmdbId,
  );

  if (
    currentRevision !== input.expectedRevision ||
    currentRevisionToken !== input.expectedRevisionToken
  ) {
    throw new AdminContentStateConflictError(
      "This content entry changed in another administrator session or content-import process. Refresh it before saving again.",
    );
  }
}

async function ensureStorage(): Promise<void> {
  await initializeAdminStorage();
}

export async function listAdminContent(
  rawQuery: unknown,
): Promise<AdminContentListResult> {
  await ensureStorage();
  const query = adminContentListQuerySchema.parse(rawQuery);

  try {
    const { documents, totalItems } = await findAdminContentDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

    return {
      items: documents.map(toSummary),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
      },
    };
  } catch (error) {
    throw new AdminContentPersistenceError(
      "FilmGeezer content entries could not be loaded.",
      { cause: error },
    );
  }
}

export async function searchAdminContentTmdb(
  rawQuery: unknown,
): Promise<AdminContentTmdbSearchResult> {
  const query = adminContentTmdbSearchQuerySchema.parse(rawQuery);

  try {
    const result = await getTmdbCatalog(query.mediaType, {
      search: query.query,
      page: query.page,
    });

    return {
      items: result.results.map(toMediaSnapshot),
      pagination: {
        page: result.page,
        totalItems: result.totalResults,
        totalPages: result.totalPages,
      },
    };
  } catch (error) {
    if (error instanceof TmdbRequestError) {
      throw error;
    }

    throw new AdminContentPersistenceError(
      "TMDB title search could not be completed.",
      { cause: error },
    );
  }
}

export async function getAdminContent(
  rawMediaType: unknown,
  rawTmdbId: unknown,
): Promise<AdminContentDetail> {
  await ensureStorage();
  const mediaType = adminContentMediaTypeSchema.parse(rawMediaType);
  const tmdbId = adminContentTmdbIdSchema.parse(rawTmdbId);

  try {
    const document = await findAdminContentDocument(mediaType, tmdbId);
    const media = await loadMediaSnapshot(mediaType, tmdbId, document);
    return toDetail(media, document);
  } catch (error) {
    if (isKnownContentError(error)) {
      throw error;
    }

    throw new AdminContentPersistenceError(
      "The FilmGeezer content entry could not be loaded.",
      { cause: error },
    );
  }
}

export async function saveAdminContent(input: {
  administrator: AdminSessionContext;
  mediaType: unknown;
  tmdbId: unknown;
  body: unknown;
  requestMetadata: AdminRequestMetadata;
}): Promise<AdminContentDetail> {
  await ensureStorage();
  const mediaType = adminContentMediaTypeSchema.parse(input.mediaType);
  const tmdbId = adminContentTmdbIdSchema.parse(input.tmdbId);
  const parsedInput: AdminContentSaveInput =
    adminContentSaveSchema.parse(input.body);
  const expectedKind = mediaType === "movie" ? "movie" : "series";
  let eventType: AdminAuditEvent = "admin-content-updated";

  if (parsedInput.kind !== expectedKind) {
    throw new AdminContentStateConflictError(
      `A ${mediaType} title must use the ${expectedKind} link structure.`,
    );
  }

  try {
    const initialDocument = await findAdminContentDocument(mediaType, tmdbId);
    eventType = initialDocument
      ? "admin-content-updated"
      : "admin-content-created";
    const media = await loadMediaSnapshot(
      mediaType,
      tmdbId,
      initialDocument,
    );
    const client = await getMongoClient();
    const session = client.startSession();
    const changedAt = new Date();
    const metadata = createAuditMetadata(input.requestMetadata);
    let savedDocument: AdminContentLinksDocument | null | undefined;

    try {
      savedDocument = await session.withTransaction(
        async (): Promise<AdminContentLinksDocument> => {
          const existingDocument = await findAdminContentDocument(
            mediaType,
            tmdbId,
            session,
          );

          eventType = existingDocument
            ? "admin-content-updated"
            : "admin-content-created";

          assertExpectedState(existingDocument, {
            mediaType,
            tmdbId,
            expectedRevision: parsedInput.expectedRevision,
            expectedRevisionToken: parsedInput.expectedRevisionToken,
          });

          let transactionDocument: AdminContentLinksDocument | null;

          if (!existingDocument) {
            const documentId = new ObjectId();

            if (parsedInput.kind === "series") {
              const mainOption = parsedInput.options.find(
                (option) => option.isMain,
              );

              if (!mainOption) {
                throw new AdminContentStateConflictError(
                  "Select one active main series link before saving.",
                );
              }

              transactionDocument = {
                _id: documentId,
                media_type: "tv",
                tmdb_id: tmdbId,
                active: true,
                kind: "series_link",
                title: media.title,
                year: media.year,
                updated_at: changedAt,
                link: mainOption.url,
                link_options: parsedInput.options.map((option) => ({
                  id: option.id,
                  url: option.url,
                  is_main: option.isMain,
                  active: option.active,
                })),
                admin_revision: 1,
                admin_updated_at: changedAt,
                admin_updated_by: input.administrator.userId,
              };
            } else {
              const persistedSources = buildPersistedMovieSources(
                parsedInput,
                null,
              );
              const mainSourceIndex = parsedInput.sources.findIndex(
                (source) => source.isMain,
              );
              const mainSource = persistedSources[mainSourceIndex];

              if (!mainSource || !isRecord(mainSource.links)) {
                throw new AdminContentStateConflictError(
                  "Select one active main movie source before saving.",
                );
              }

              transactionDocument = {
                _id: documentId,
                media_type: "movie",
                tmdb_id: tmdbId,
                active: true,
                kind: "movie_links",
                title: media.title,
                year: media.year,
                updated_at: changedAt,
                links: mainSource.links,
                movie_sources: persistedSources,
                admin_revision: 1,
                admin_updated_at: changedAt,
                admin_updated_by: input.administrator.userId,
              };
            }

            await insertAdminContentDocument(transactionDocument, session);
          } else if (parsedInput.kind === "series") {
            const mainOption = parsedInput.options.find(
              (option) => option.isMain,
            );

            if (!mainOption) {
              throw new AdminContentStateConflictError(
                "Select one active main series link before saving.",
              );
            }

            transactionDocument = await updateAdminSeriesContentDocument(
              {
                documentId: existingDocument._id,
                expectedRevision: parsedInput.expectedRevision,
                active: existingDocument.active === true,
                title: media.title,
                year: media.year,
                link: mainOption.url,
                linkOptions: parsedInput.options.map((option) => ({
                  id: option.id,
                  url: option.url,
                  is_main: option.isMain,
                  active: option.active,
                })),
                updatedAt: changedAt,
                updatedBy: input.administrator.userId,
              },
              session,
            );
          } else {
            const persistedSources = buildPersistedMovieSources(
              parsedInput,
              existingDocument,
            );
            const mainSourceIndex = parsedInput.sources.findIndex(
              (source) => source.isMain,
            );
            const mainSource = persistedSources[mainSourceIndex];

            if (!mainSource || !isRecord(mainSource.links)) {
              throw new AdminContentStateConflictError(
                "Select one active main movie source before saving.",
              );
            }

            transactionDocument = await updateAdminMovieContentDocument(
              {
                documentId: existingDocument._id,
                expectedRevision: parsedInput.expectedRevision,
                active: existingDocument.active === true,
                title: media.title,
                year: media.year,
                links: mainSource.links,
                movieSources: persistedSources,
                updatedAt: changedAt,
                updatedBy: input.administrator.userId,
              },
              session,
            );
          }

          if (!transactionDocument) {
            throw new AdminContentStateConflictError(
              "This content entry changed before the save completed. Refresh it and try again.",
            );
          }

          const counts = countContentLinks(transactionDocument);
          await createAdminAuditEvent(
            {
              auditEventId: new ObjectId(),
              actorUserId: input.administrator.userId,
              eventType,
              outcome: "success",
              ipHash: metadata.ipHash,
              userAgentSummary: metadata.userAgentSummary,
              details: {
                mediaType,
                tmdbId,
                revision: getCurrentRevision(transactionDocument),
                sourceCount: counts.sourceCount,
                linkCount: counts.linkCount,
              },
              createdAt: changedAt,
            },
            session,
          );

          return transactionDocument;
        },
        ADMIN_CONTENT_TRANSACTION_OPTIONS,
      );
    } finally {
      await session.endSession();
    }

    if (!savedDocument) {
      throw new AdminContentPersistenceError(
        "The FilmGeezer content entry was not saved.",
      );
    }

    return toDetail(media, savedDocument);
  } catch (error) {
    await recordFailedAction({
      eventType,
      administrator: input.administrator,
      mediaType,
      tmdbId,
      requestMetadata: input.requestMetadata,
      error,
    });

    if (error instanceof MongoServerError && error.code === 11000) {
      throw new AdminContentStateConflictError(
        "This title already has a FilmGeezer content entry. Refresh the content list before saving.",
      );
    }

    if (isKnownContentError(error)) {
      throw error;
    }

    throw new AdminContentPersistenceError(
      "The FilmGeezer content entry could not be saved.",
      { cause: error },
    );
  }
}

export async function changeAdminContentStatus(input: {
  administrator: AdminSessionContext;
  mediaType: unknown;
  tmdbId: unknown;
  body: unknown;
  requestMetadata: AdminRequestMetadata;
}): Promise<AdminContentDetail> {
  await ensureStorage();
  const mediaType = adminContentMediaTypeSchema.parse(input.mediaType);
  const tmdbId = adminContentTmdbIdSchema.parse(input.tmdbId);
  const parsedInput: AdminContentStatusInput =
    adminContentStatusSchema.parse(input.body);
  const eventType: AdminAuditEvent = "admin-content-status-updated";

  try {
    const client = await getMongoClient();
    const session = client.startSession();
    const changedAt = new Date();
    const metadata = createAuditMetadata(input.requestMetadata);
    let savedDocument: AdminContentLinksDocument | null | undefined;

    try {
      savedDocument = await session.withTransaction(
        async (): Promise<AdminContentLinksDocument> => {
          const existingDocument = await findAdminContentDocument(
            mediaType,
            tmdbId,
            session,
          );

          if (!existingDocument) {
            throw new AdminContentNotFoundError();
          }

          assertExpectedState(existingDocument, {
            mediaType,
            tmdbId,
            expectedRevision: parsedInput.expectedRevision,
            expectedRevisionToken: parsedInput.expectedRevisionToken,
          });

          if (existingDocument.active === parsedInput.active) {
            throw new AdminContentStateConflictError(
              parsedInput.active
                ? "This content entry is already active."
                : "This content entry is already disabled.",
            );
          }

          const transactionDocument = await updateAdminContentStatus(
            {
              documentId: existingDocument._id,
              expectedRevision: parsedInput.expectedRevision,
              active: parsedInput.active,
              updatedAt: changedAt,
              updatedBy: input.administrator.userId,
            },
            session,
          );

          if (!transactionDocument) {
            throw new AdminContentStateConflictError(
              "This content entry changed before the status update completed. Refresh it and try again.",
            );
          }

          await createAdminAuditEvent(
            {
              auditEventId: new ObjectId(),
              actorUserId: input.administrator.userId,
              eventType,
              outcome: "success",
              ipHash: metadata.ipHash,
              userAgentSummary: metadata.userAgentSummary,
              details: {
                mediaType,
                tmdbId,
                active: parsedInput.active,
                reason: parsedInput.reason,
                revision: getCurrentRevision(transactionDocument),
              },
              createdAt: changedAt,
            },
            session,
          );

          return transactionDocument;
        },
        ADMIN_CONTENT_TRANSACTION_OPTIONS,
      );
    } finally {
      await session.endSession();
    }

    if (!savedDocument) {
      throw new AdminContentPersistenceError(
        "The FilmGeezer content status was not updated.",
      );
    }

    let media: AdminContentMediaSnapshot;

    try {
      media = await loadMediaSnapshot(mediaType, tmdbId, savedDocument);
    } catch {
      media = createStoredMediaSnapshot(savedDocument);
    }

    return toDetail(media, savedDocument);
  } catch (error) {
    await recordFailedAction({
      eventType,
      administrator: input.administrator,
      mediaType,
      tmdbId,
      requestMetadata: input.requestMetadata,
      error,
    });

    if (isKnownContentError(error)) {
      throw error;
    }

    throw new AdminContentPersistenceError(
      "The FilmGeezer content status could not be updated.",
      { cause: error },
    );
  }
}
