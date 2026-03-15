import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  RuntimeEvent,
  RuntimeJob,
  RuntimeMeshSummary,
} from "../../../packages/contracts/src/index.ts";
import { hydrateRuntimeState, type RuntimeState } from "../../../packages/domain/src/index.ts";

export type RuntimePersistence = {
  dbPath: string;
  loadState: () => RuntimeState;
  appendEvent: (event: RuntimeEvent) => void;
  upsertMeshSnapshot: (runtimeRoot: string, mesh: RuntimeMeshSummary) => void;
  loadMeshSnapshot: (runtimeRoot: string) => RuntimeMeshSummary | null;
  listRuntimeRoots: () => string[];
};

type EventRow = {
  event_json: string;
};

type JobRow = {
  job_json: string;
};

type MeshRow = {
  mesh_json: string;
};

export function createRuntimePersistence(projectRoot: string, explicitDbPath?: string): RuntimePersistence {
  const dbPath = explicitDbPath?.trim()
    ? resolve(projectRoot, explicitDbPath)
    : resolve(projectRoot, ".agent-context/runtime-api/runtime-state.sqlite");

  mkdirSync(dirname(dbPath), { recursive: true });

  const database = new DatabaseSync(dbPath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS runtime_jobs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      job_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      type TEXT NOT NULL,
      ts TEXT NOT NULL,
      event_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_mesh_snapshots (
      runtime_root TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      mesh_json TEXT NOT NULL
    );
  `);

  const insertEvent = database.prepare(
    `INSERT INTO runtime_events (job_id, type, ts, event_json) VALUES (?, ?, ?, ?)`,
  );
  const upsertJob = database.prepare(`
    INSERT INTO runtime_jobs (id, created_at, updated_at, job_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      job_json = excluded.job_json
  `);
  const upsertMesh = database.prepare(`
    INSERT INTO runtime_mesh_snapshots (runtime_root, generated_at, mesh_json)
    VALUES (?, ?, ?)
    ON CONFLICT(runtime_root) DO UPDATE SET
      generated_at = excluded.generated_at,
      mesh_json = excluded.mesh_json
  `);
  const selectJobs = database.prepare(`SELECT job_json FROM runtime_jobs ORDER BY updated_at DESC, created_at DESC`);
  const selectEvents = database.prepare(`SELECT event_json FROM runtime_events ORDER BY seq ASC`);
  const selectMesh = database.prepare(`SELECT mesh_json FROM runtime_mesh_snapshots WHERE runtime_root = ?`);
  const listRoots = database.prepare(`SELECT runtime_root FROM runtime_mesh_snapshots ORDER BY runtime_root ASC`);

  return {
    dbPath,
    loadState() {
      void database;
      const jobs = selectJobs.all() as JobRow[];
      const events = selectEvents.all() as EventRow[];
      return hydrateRuntimeState(
        jobs.map((row) => JSON.parse(row.job_json) as RuntimeJob),
        events.map((row) => JSON.parse(row.event_json) as RuntimeEvent),
      );
    },
    appendEvent(event) {
      void database;
      const jobId = event.type === "job.command.accepted" ? event.jobId : event.type === "runtime.snapshot" ? null : event.job.id;
      insertEvent.run(jobId, event.type, event.ts, JSON.stringify(event));

      if (event.type === "job.created" || event.type === "job.updated") {
        upsertJobRecord(upsertJob, event.job);
      }
    },
    upsertMeshSnapshot(runtimeRoot, mesh) {
      void database;
      upsertMesh.run(runtimeRoot, mesh.generatedAt, JSON.stringify(mesh));
    },
    loadMeshSnapshot(runtimeRoot) {
      void database;
      const row = selectMesh.get(runtimeRoot) as MeshRow | undefined;
      return row ? (JSON.parse(row.mesh_json) as RuntimeMeshSummary) : null;
    },
    listRuntimeRoots() {
      void database;
      return (listRoots.all() as Array<{ runtime_root: string }>).map((row) => row.runtime_root);
    },
  };
}

function upsertJobRecord(statement: ReturnType<DatabaseSync["prepare"]>, job: RuntimeJob) {
  statement.run(job.id, job.createdAt, job.updatedAt, JSON.stringify(job));
}
