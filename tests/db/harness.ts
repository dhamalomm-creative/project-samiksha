import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const root = join(import.meta.dirname, "..", "..");

/** Boots a throwaway Postgres loaded with the real migration. */
export async function startDb(port: number) {
  const dir = mkdtempSync(join(tmpdir(), "samiksha-pg-"));
  const server = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await server.initialise();
  await server.start();

  const connect = async () => {
    const client = new pg.Client({
      host: "localhost",
      port,
      user: "postgres",
      password: "postgres",
      database: "postgres",
    });
    await client.connect();
    return client;
  };

  const client = await connect();
  await client.query(readFileSync(join(root, "tests/db/supabase-stub.sql"), "utf8"));
  await client.query(readFileSync(join(root, "supabase/migrations/0001_init.sql"), "utf8"));

  return {
    client,
    connect,
    stop: async () => {
      await client.end();
      await server.stop();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
