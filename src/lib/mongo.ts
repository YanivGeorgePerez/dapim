import { MongoClient, Db } from "mongodb";
import { config } from "dotenv";
config(); // load .env

const uri = process.env.MONGODB_URI!;
const dbName = process.env.DB_NAME!;

const client = new MongoClient(uri);
let db: Db;

export async function connectToDB() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log("✅ Connected to MongoDB");
  }
  return db;
}
