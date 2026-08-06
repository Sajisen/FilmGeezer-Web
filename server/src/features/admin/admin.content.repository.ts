import type {
  ClientSession,
  Collection,
  Filter,
} from "mongodb";

import { getContentDatabase } from "../../config/database.js";
import { env } from "../../config/env.js";
import type {
  AdminContentLinksDocument,
  AdminContentListQuery,
  AdminContentMediaType,
} from "./admin.content.types.js";

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function getAdminContentCollection(): Promise<
  Collection<AdminContentLinksDocument>
> {
  const database = await getContentDatabase();

  return database.collection<AdminContentLinksDocument>(
    env.MONGODB_CONTENT_LINKS_COLLECTION,
  );
}

function buildAdminContentFilter(
  query: AdminContentListQuery,
): Filter<AdminContentLinksDocument> {
  const filter: Filter<AdminContentLinksDocument> = {};

  if (query.mediaType !== "all") {
    filter.media_type = query.mediaType;
  }

  if (query.status === "active") {
    filter.active = true;
  } else if (query.status === "inactive") {
    filter.active = false;
  }

  if (query.search) {
    const escaped = escapeRegularExpression(query.search);
    const conditions: Filter<AdminContentLinksDocument>[] = [
      { title: new RegExp(escaped, "iu") },
    ];

    if (/^\d+$/u.test(query.search)) {
      const tmdbId = Number(query.search);

      if (Number.isSafeInteger(tmdbId) && tmdbId > 0) {
        conditions.unshift({ tmdb_id: tmdbId });
      }
    }

    filter.$or = conditions;
  }

  return filter;
}

export async function findAdminContentDocuments(
  query: AdminContentListQuery,
): Promise<{
  documents: AdminContentLinksDocument[];
  totalItems: number;
}> {
  const collection = await getAdminContentCollection();
  const filter = buildAdminContentFilter(query);
  const skip = (query.page - 1) * query.pageSize;

  const [documents, totalItems] = await Promise.all([
    collection
      .find(filter, {
        projection: {
          media_type: 1,
          tmdb_id: 1,
          active: 1,
          kind: 1,
          title: 1,
          year: 1,
          updated_at: 1,
          link: 1,
          link_options: 1,
          links: 1,
          movie_sources: 1,
          admin_revision: 1,
          admin_updated_at: 1,
        },
      })
      .sort({ admin_updated_at: -1, updated_at: -1, _id: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return { documents, totalItems };
}

export async function findAdminContentDocument(
  mediaType: AdminContentMediaType,
  tmdbId: number,
  session?: ClientSession,
): Promise<AdminContentLinksDocument | null> {
  const collection = await getAdminContentCollection();

  return collection.findOne(
    {
      media_type: mediaType,
      tmdb_id: tmdbId,
    },
    session ? { session } : undefined,
  );
}

export async function insertAdminContentDocument(
  document: AdminContentLinksDocument,
  session: ClientSession,
): Promise<void> {
  const collection = await getAdminContentCollection();
  await collection.insertOne(document, { session });
}

export async function updateAdminSeriesContentDocument(
  input: {
    documentId: AdminContentLinksDocument["_id"];
    expectedRevision: number;
    active: boolean;
    title: string;
    year: string;
    link: string;
    linkOptions: unknown[];
    updatedAt: Date;
    updatedBy: AdminContentLinksDocument["_id"];
  },
  session: ClientSession,
): Promise<AdminContentLinksDocument | null> {
  const collection = await getAdminContentCollection();
  const revisionCondition =
    input.expectedRevision === 0
      ? {
          $or: [
            { admin_revision: 0 },
            { admin_revision: { $exists: false } },
          ],
        }
      : { admin_revision: input.expectedRevision };

  return collection.findOneAndUpdate(
    {
      _id: input.documentId,
      ...revisionCondition,
    },
    {
      $set: {
        media_type: "tv",
        active: input.active,
        kind: "series_link",
        title: input.title,
        year: input.year,
        updated_at: input.updatedAt,
        link: input.link,
        link_options: input.linkOptions,
        admin_revision: input.expectedRevision + 1,
        admin_updated_at: input.updatedAt,
        admin_updated_by: input.updatedBy,
      },
      $unset: {
        links: "",
        movie_sources: "",
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

export async function updateAdminMovieContentDocument(
  input: {
    documentId: AdminContentLinksDocument["_id"];
    expectedRevision: number;
    active: boolean;
    title: string;
    year: string;
    links: Record<string, unknown>;
    movieSources: unknown[];
    updatedAt: Date;
    updatedBy: AdminContentLinksDocument["_id"];
  },
  session: ClientSession,
): Promise<AdminContentLinksDocument | null> {
  const collection = await getAdminContentCollection();
  const revisionCondition =
    input.expectedRevision === 0
      ? {
          $or: [
            { admin_revision: 0 },
            { admin_revision: { $exists: false } },
          ],
        }
      : { admin_revision: input.expectedRevision };

  return collection.findOneAndUpdate(
    {
      _id: input.documentId,
      ...revisionCondition,
    },
    {
      $set: {
        media_type: "movie",
        active: input.active,
        kind: "movie_links",
        title: input.title,
        year: input.year,
        updated_at: input.updatedAt,
        links: input.links,
        movie_sources: input.movieSources,
        admin_revision: input.expectedRevision + 1,
        admin_updated_at: input.updatedAt,
        admin_updated_by: input.updatedBy,
      },
      $unset: {
        link: "",
        link_options: "",
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

export async function updateAdminContentStatus(
  input: {
    documentId: AdminContentLinksDocument["_id"];
    expectedRevision: number;
    active: boolean;
    updatedAt: Date;
    updatedBy: AdminContentLinksDocument["_id"];
  },
  session: ClientSession,
): Promise<AdminContentLinksDocument | null> {
  const collection = await getAdminContentCollection();
  const revisionCondition =
    input.expectedRevision === 0
      ? {
          $or: [
            { admin_revision: 0 },
            { admin_revision: { $exists: false } },
          ],
        }
      : { admin_revision: input.expectedRevision };

  return collection.findOneAndUpdate(
    {
      _id: input.documentId,
      ...revisionCondition,
    },
    {
      $set: {
        active: input.active,
        updated_at: input.updatedAt,
        admin_revision: input.expectedRevision + 1,
        admin_updated_at: input.updatedAt,
        admin_updated_by: input.updatedBy,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}
