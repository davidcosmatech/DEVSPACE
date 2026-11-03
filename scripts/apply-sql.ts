import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const target = process.argv[2];
if (!target) {
  console.error("Usage: tsx scripts/apply-sql.ts <file.sql>");
  process.exit(1);
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL must point at the Supabase PostgreSQL database.");
  process.exit(1);
}

const file = path.resolve(target);
const statement = await readFile(file, "utf8");
const client = postgres(url, { max: 1, prepare: false, connect_timeout: 20 });

try {
  await client.unsafe(statement);
  console.log(`Applied ${path.basename(file)} successfully.`);
} finally {
  await client.end({ timeout: 5 });
}
