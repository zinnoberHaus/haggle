import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

async function main() {
  config({ path: ".env.local", quiet: true });
  const connection =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connection) throw new Error("DATABASE_URL is required");
  const direct = new URL(connection);
  direct.hostname = direct.hostname.replace("-pooler.", ".");
  const sql = neon(direct.toString());
  await sql`CREATE TABLE IF NOT EXISTS haggle_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
  for (const name of (await readdir("migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const source = await readFile(`migrations/${name}`, "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const applied =
      await sql`SELECT checksum FROM haggle_migrations WHERE name = ${name}`;
    if (applied.length) {
      if (applied[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}`);
      console.log(`Already applied: ${name}`);
      continue;
    }
    // Driver raw query supports only a single SQL command per call. Migrations use
    // simple DDL with no procedural bodies; execute each statement in one transaction.
    const statements = source
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    await sql.transaction([
      ...statements.map((statement) => sql.query(statement, [])),
      sql`INSERT INTO haggle_migrations (name, checksum) VALUES (${name}, ${checksum})`,
    ]);
    console.log(`Applied: ${name}`);
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
});
