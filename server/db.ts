// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
// IMPORTANT: pg is CommonJS. In ESM you must default-import then destructure.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Render Postgres usually needs TLS (even with the Internal URL).
// rejectUnauthorized:false keeps it compatible across providers.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
// Optional: export pool if you need raw queries in services
export { pool };
