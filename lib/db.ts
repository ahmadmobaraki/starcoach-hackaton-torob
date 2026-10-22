import Database from "better-sqlite3";
import path from "node:path";

const globalForDb = globalThis as unknown as {
  __hamqadamDb?: Database.Database;
};

function resolveDbPath(): string {
  if (process.env.DB_PATH) return path.resolve(process.env.DB_PATH);
  return path.join(process.cwd(), "data", "torob.db");
}

export function getDb(): Database.Database {
  if (globalForDb.__hamqadamDb) return globalForDb.__hamqadamDb;

  const db = new Database(resolveDbPath(), { fileMustExist: true });
  db.pragma("busy_timeout = 5000");
  try {
    db.pragma("journal_mode = WAL");
  } catch {
    // A read-only filesystem still works for search; writes will fail loudly.
  }
  db.pragma("foreign_keys = ON");
  globalForDb.__hamqadamDb = db;
  return db;
}

export function getCounts() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    shops: one("SELECT COUNT(*) AS n FROM shops"),
    products: one("SELECT COUNT(*) AS n FROM products"),
    offers: one("SELECT COUNT(*) AS n FROM offers"),
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
