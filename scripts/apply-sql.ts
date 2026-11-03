import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: tsx scripts/apply-sql.ts <file.sql>");
    process.exitCode = 1;
    return;
  }

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DIRECT_URL or DATABASE_URL must point at the Supabase PostgreSQL database.");
    process.exitCode = 1;
    return;
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SQL apply failed.");
  process.exitCode = 1;
});
