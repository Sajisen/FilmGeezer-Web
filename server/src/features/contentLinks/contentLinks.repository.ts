import type { Collection } from "mongodb";
import { getContentDatabase } from "../../config/database.js";
import { env } from "../../config/env.js";
import type {
  ContentLinkMediaType,
  ContentLinksDocument,
} from "./contentLinks.types.js";


export class ContentLinksDataSourceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ContentLinksDataSourceError";
  }
}

async function getContentLinksCollection(): Promise<
  Collection<ContentLinksDocument>
> {
  const database = await getContentDatabase();

return database.collection<ContentLinksDocument>(
  env.MONGODB_CONTENT_LINKS_COLLECTION,
);
}

export async function findActiveContentLinksDocument(
  mediaType: ContentLinkMediaType,
  tmdbId: number,
) {
  try {
    const collection = await getContentLinksCollection();

    return await collection.findOne(
      {
        media_type: mediaType,
        tmdb_id: tmdbId,
        active: true,
      },
      {
        projection: {
          _id: 0,
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
        },
      },
    );
  } catch (error) {
    throw new ContentLinksDataSourceError(
      "The content-links data source could not be reached.",
      { cause: error },
    );
  }
}