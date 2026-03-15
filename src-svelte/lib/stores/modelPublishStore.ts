/**
 * modelPublishStore.ts — Tracks models published by the current user.
 *
 * In demo mode, stores in memory.
 * In connected mode, pushes to API and refetches.
 */

import { writable, get } from 'svelte/store';
import { connectionMode, apiBase } from './connectionStore.ts';

// ── Types (inlined from protocol contracts) ──

export interface ModelVTR {
  grade: 'DETERMINISTIC' | 'STOCHASTIC' | 'UNVERIFIED';
  trainingSeed: number;
  baseModelId: string;
  ckptHash: string;
  ppapRootRef: string;
}

export interface ModelMetrics {
  best: number;
  experiments: number;
  kept: number;
}

export interface ModelUsage {
  totalCalls: number;
  totalRevenue: number;
  dailyCalls: number[];
}

export interface PoolASplit {
  creator: number;
  notary: number;
  treasury: number;
  burn: number;
}

export interface ModelRecord {
  id: string;
  slug: string;
  name: string;
  state: 'NETWORK_ACTIVE' | 'PAUSED' | 'RETIRED';
  originJobId: string;
  vtr: ModelVTR;
  metrics: ModelMetrics;
  usage: ModelUsage;
  poolA: PoolASplit;
  createdAt: string;
  updatedAt: string;
}

// ── Store ──

const { subscribe, update, set } = writable<ModelRecord[]>([]);

/**
 * Publish a new model. Returns the generated model ID.
 */
async function publishModel(record: ModelRecord): Promise<string> {
  if (get(connectionMode) === 'connected') {
    try {
      const res = await fetch(`${get(apiBase)}/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const created = await res.json();
        update(models => [...models, created]);
        return created.id;
      }
    } catch {
      // Fall through to demo mode
    }
  }

  // Demo mode: store locally
  update(models => [...models, record]);
  return record.id;
}

/**
 * Get all models published by the current user.
 */
function getPublishedModels(): ModelRecord[] {
  return get({ subscribe });
}

/**
 * Build a ModelRecord from research completion data.
 */
function buildModelRecord(opts: {
  topic: string;
  bestMetric: number;
  totalExperiments: number;
  keptExperiments: number;
  jobId?: string;
}): ModelRecord {
  const now = new Date().toISOString();
  const slug = opts.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `model-${slug}-${Date.now().toString(36)}`;

  return {
    id,
    slug,
    name: `${opts.topic} v1`,
    state: 'NETWORK_ACTIVE',
    originJobId: opts.jobId ?? `job-${Date.now().toString(36)}`,
    vtr: {
      grade: 'DETERMINISTIC',
      trainingSeed: 42,
      baseModelId: 'transformer-base-v3',
      ckptHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      ppapRootRef: `ppap-batch-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    },
    metrics: {
      best: opts.bestMetric,
      experiments: opts.totalExperiments,
      kept: opts.keptExperiments,
    },
    usage: { totalCalls: 0, totalRevenue: 0, dailyCalls: [0, 0, 0, 0, 0, 0, 0] },
    poolA: { creator: 0.60, notary: 0.15, treasury: 0.15, burn: 0.10 },
    createdAt: now,
    updatedAt: now,
  };
}

export const modelPublishStore = {
  subscribe,
  publishModel,
  getPublishedModels,
  buildModelRecord,
  reset: () => set([]),
};
