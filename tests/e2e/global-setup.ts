import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { E2E_PG_PORT } from "./embedded-db";

const dataDir = path.resolve(process.cwd(), ".playwright-pg-data");
const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");

export default async function globalSetup() {
  // `stop()`'s own cleanup can lose a race with Windows file locks and leave
  // a stale (non-empty) data dir behind; initdb refuses to init into one.
  rmSync(dataDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: E2E_PG_PORT,
    persistent: false,
    onLog: () => {},
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("settlr_e2e");

  const client = pg.getPgClient("settlr_e2e");
  await client.connect();
  const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const folder of migrationFolders) {
    const sql = readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf-8");
    await client.query(sql);
  }
  await client.end();

  return async () => {
    await pg.stop();
  };
}
