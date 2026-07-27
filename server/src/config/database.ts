import {
  MongoClient,
  ServerApiVersion,
  type Db,
} from "mongodb";
import { env } from "./env.js";

const SERVER_SELECTION_TIMEOUT_MS = 8_000;
const CONNECTION_WAIT_TIMEOUT_MS = 5_000;
const MAX_IDLE_TIME_MS = 60_000;

let mongoClient: MongoClient | null = null;
let mongoClientPromise: Promise<MongoClient> | null = null;

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

async function createMongoClient() {
  const client = new MongoClient(env.MONGODB_URI, {
    appName: "FilmGeezer-Web-API",

    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },

    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: MAX_IDLE_TIME_MS,
    waitQueueTimeoutMS: CONNECTION_WAIT_TIMEOUT_MS,
    connectTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });

  mongoClient = client;

  try {
    await client.connect();

    await client
      .db(env.MONGODB_CONTENT_DB_NAME)
      .command({ ping: 1 });

    return client;
  } catch (error) {
    await client.close().catch(() => undefined);

    mongoClient = null;

    throw error;
  }
}

export function getMongoClient() {
  if (!mongoClientPromise) {
    mongoClientPromise = createMongoClient().catch((error) => {
      mongoClientPromise = null;
      throw error;
    });
  }

  return mongoClientPromise;
}

async function getDatabase(databaseName: string): Promise<Db> {
  const client = await getMongoClient();

  return client.db(databaseName);
}

export function getContentDatabase() {
  return getDatabase(env.MONGODB_CONTENT_DB_NAME);
}

export function getWebDatabase() {
  return getDatabase(env.MONGODB_WEB_DB_NAME);
}

export async function closeMongoConnection() {
  const client = mongoClient;

  mongoClient = null;
  mongoClientPromise = null;

  if (client) {
    await client.close();
  }
}