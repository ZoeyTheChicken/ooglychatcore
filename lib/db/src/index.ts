import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Oogly Chat uses an external Neon.tech PostgreSQL database.
// Set DATABASE_URL to your Neon connection string, e.g.:
// postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://PLACEHOLDER:PLACEHOLDER@ep-PLACEHOLDER.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export * from "./schema";
