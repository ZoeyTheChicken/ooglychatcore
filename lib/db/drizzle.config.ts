import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.DB_SECRET || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("Missing DB_SECRET (or DATABASE_URL) environment variable");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: true,
  },
});
