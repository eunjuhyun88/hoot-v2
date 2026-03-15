import { randomUUID } from "node:crypto";

import type {
  RuntimeMeshEvent,
  RuntimeMeshSummary,
} from "../../../packages/contracts/src/index.ts";
import { inspectAutoresearchRuntimeRoot } from "../../../packages/autoresearch-adapter/src/index.ts";
import type { RuntimePersistence } from "./persistence.ts";

type MeshBroker = {
  resolveRuntimeRoot: (runtimeRoot?: string | null) => string;
  listRuntimeRoots: () => string[];
  getSnapshot: (runtimeRoot?: string | null, options?: { force?: boolean }) => Promise<RuntimeMeshSummary>;
  subscribe: (runtimeRoot: string | null | undefined, listener: (event: RuntimeMeshEvent) => void) => () => void;
};

type MeshCacheEntry = {
  hash: string;
  mesh: RuntimeMeshSummary;
};

export function createRuntimeMeshBroker(input: {
  projectRoot: string;
  defaultRuntimeRoot: string;
  persistence: RuntimePersistence;
  pollMs?: number;
}): MeshBroker {
  const cache = new Map<string, MeshCacheEntry>();
  const subscribers = new Map<string, Map<string, (event: RuntimeMeshEvent) => void>>();
  const pollMs = Math.max(500, input.pollMs ?? 2500);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function resolveRuntimeRoot(runtimeRoot?: string | null) {
    const trimmed = runtimeRoot?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : input.defaultRuntimeRoot;
  }

  function listRuntimeRoots() {
    return Array.from(new Set([
      ...input.persistence.listRuntimeRoots(),
      ...cache.keys(),
      ...subscribers.keys(),
    ])).sort();
  }

  async function getSnapshot(runtimeRoot?: string | null, options: { force?: boolean } = {}) {
    const resolvedRoot = resolveRuntimeRoot(runtimeRoot);
    const cached = cache.get(resolvedRoot);

    if (!options.force && cached) {
      return cached.mesh;
    }

    if (!options.force && !cached) {
      const persisted = input.persistence.loadMeshSnapshot(resolvedRoot);
      if (persisted) {
        cache.set(resolvedRoot, {
          hash: JSON.stringify(persisted),
          mesh: persisted,
        });
      }
    }

    const previous = cache.get(resolvedRoot);
    const mesh = await inspectAutoresearchRuntimeRoot(input.projectRoot, resolvedRoot);
    const nextHash = JSON.stringify(mesh);

    cache.set(resolvedRoot, { hash: nextHash, mesh });
    input.persistence.upsertMeshSnapshot(resolvedRoot, mesh);

    if (!previous || previous.hash !== nextHash) {
      publish({
        type: "mesh.updated",
        ts: mesh.generatedAt,
        runtimeRoot: resolvedRoot,
        mesh,
      });
    }

    return mesh;
  }

  function subscribe(runtimeRoot: string | null | undefined, listener: (event: RuntimeMeshEvent) => void) {
    const resolvedRoot = resolveRuntimeRoot(runtimeRoot);
    const listenerId = randomUUID();
    let bucket = subscribers.get(resolvedRoot);
    if (!bucket) {
      bucket = new Map();
      subscribers.set(resolvedRoot, bucket);
    }
    bucket.set(listenerId, listener);
    ensurePolling();

    return () => {
      const current = subscribers.get(resolvedRoot);
      current?.delete(listenerId);
      if (current && current.size === 0) {
        subscribers.delete(resolvedRoot);
      }
      ensurePolling();
    };
  }

  function publish(event: RuntimeMeshEvent) {
    const bucket = subscribers.get(event.runtimeRoot);
    if (!bucket) {
      return;
    }
    for (const listener of bucket.values()) {
      listener(event);
    }
  }

  function ensurePolling() {
    if (subscribers.size === 0) {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      return;
    }

    if (pollTimer) {
      return;
    }

    pollTimer = setInterval(() => {
      for (const runtimeRoot of subscribers.keys()) {
        void getSnapshot(runtimeRoot).catch(() => {
          // Keep the last known snapshot when a runtime root is temporarily unavailable.
        });
      }
    }, pollMs);
  }

  return {
    resolveRuntimeRoot,
    listRuntimeRoots,
    getSnapshot,
    subscribe,
  };
}
