import { MongoClient, Db } from 'mongodb';
import { logger } from './logger';

const uri: any = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_NAME;

export let cachedClient: MongoClient | null = null;
export let cachedDb: Db | null = null;

if (!uri || !dbName) {
  logger.error('Please add your MongoDB URI and Database Name to the environment variables');
}

export async function databaseConnect(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const connection = new MongoClient(uri);
  const client = await connection.connect();

  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
