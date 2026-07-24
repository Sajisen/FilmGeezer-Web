import { MongoClient, type Db } from "mongodb";

const DEFAULT_DATABASE_NAME = "filmgeezer_bot";
const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 8_000;

let mongoClient: MongoClient | null = null;
let databasePromise: Promise<Db> | null = null;

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

function getMongoConfiguration() {
  const uri = process.env.MONGODB_URI?.trim();
  const databaseName =
    process.env.MONGODB_DB_NAME?.trim() || DEFAULT_DATABASE_NAME;

  if (!uri) {
    throw new DatabaseConfigurationError(
      "MONGODB_URI is not configured for the FilmGeezer server.",
    );
  }

  return {
    uri,
    databaseName,
  };
}

async function createDatabaseConnection() {
  const { uri, databaseName } = getMongoConfiguration();

  mongoClient = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    connectTimeoutMS: DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
    serverSelectionTimeoutMS: DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
  });

  try {
    await mongoClient.connect();

    const database = mongoClient.db(databaseName);
    await database.command({ ping: 1 });

    return database;
  } catch (error) {
    await mongoClient.close().catch(() => undefined);
    mongoClient = null;
    throw error;
  }
}

export function getMongoDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabaseConnection().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

export async function closeMongoConnection() {
  const client = mongoClient;

  mongoClient = null;
  databasePromise = null;

  if (client) {
    await client.close();
  }
}