import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Set it to your Postgres connection string " +
    "(e.g. from Neon or Render Postgres) in your .env file / Render dashboard."
  );
}

// Neon and Render Postgres both require SSL. Local Postgres (e.g. on your own
// machine without SSL configured) generally doesn't need it, so we only turn
// it on unless the connection string points at localhost.
const isLocal = (process.env.DATABASE_URL || "").includes("localhost")
  || (process.env.DATABASE_URL || "").includes("127.0.0.1");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Creates the tables if they don't already exist. Safe to run on every boot —
// it's all `CREATE TABLE IF NOT EXISTS`, so an already-initialized database
// is untouched.
export async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
}
