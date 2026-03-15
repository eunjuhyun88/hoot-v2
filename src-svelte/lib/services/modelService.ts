/**
 * modelService.ts — Async model data service.
 *
 * Pattern: connected → API fetch → catch → demo fallback.
 * Consumers call loadModels() and get ModelRecord[] regardless of mode.
 */

import { get } from 'svelte/store';
import { connectionMode, apiBase } from '../stores/connectionStore.ts';
import { fetchModels, fetchModel } from '../api/client.ts';
import type { ModelRecord } from '../../../packages/contracts/src/index.ts';

// ── Demo data (inline to avoid circular deps) ──
let demoModelsCache: ModelRecord[] | null = null;

function getDemoModels(): ModelRecord[] {
  if (demoModelsCache) return demoModelsCache;

  const now = Date.now();
  const day = 86400000;
  demoModelsCache = [
    {
      id: 'model-crypto-24h-v3', slug: 'crypto-24h-v3', name: 'Crypto 24h Prediction v3',
      state: 'NETWORK_ACTIVE', originJobId: 'job-2878',
      vtr: { grade: 'DETERMINISTIC', trainingSeed: 42, baseModelId: 'transformer-base-v3', ckptHash: '0xab3f...c912', ppapRootRef: 'ppap-batch-0035' },
      metrics: { best: 0.891, experiments: 8, kept: 3 },
      usage: { totalCalls: 12480, totalRevenue: 4.82, dailyCalls: [1840, 1720, 1650, 1890, 2010, 1780, 1590] },
      poolA: { creator: 2.89, notary: 0.72, treasury: 0.72, burn: 0.48 },
      createdAt: new Date(now - 14 * day).toISOString(), updatedAt: new Date(now - 0.5 * day).toISOString(),
    },
    {
      id: 'model-defi-risk-v1', slug: 'defi-risk-v1', name: 'DeFi Risk Scoring v1',
      state: 'NETWORK_ACTIVE', originJobId: 'job-2887',
      vtr: { grade: 'DETERMINISTIC', trainingSeed: 77, baseModelId: 'gbm-risk-v1', ckptHash: '0x7d21...e4a8', ppapRootRef: 'ppap-batch-0039' },
      metrics: { best: 0.931, experiments: 5, kept: 3 },
      usage: { totalCalls: 3240, totalRevenue: 1.08, dailyCalls: [420, 380, 510, 490, 460, 520, 460] },
      poolA: { creator: 0.65, notary: 0.16, treasury: 0.16, burn: 0.11 },
      createdAt: new Date(now - 5 * day).toISOString(), updatedAt: new Date(now - 1 * day).toISOString(),
    },
    {
      id: 'model-eth-gas-v2', slug: 'eth-gas-v2', name: 'ETH Gas Prediction v2',
      state: 'PRIVATE_ACTIVE', originJobId: 'job-2882',
      vtr: { grade: 'SELF_ATTESTED', baseModelId: 'lstm-gas-v2', ckptHash: '0x5e42...a1d9', ppapRootRef: 'ppap-batch-0037' },
      metrics: { best: 0.834, experiments: 3, kept: 2 },
      usage: { totalCalls: 890, totalRevenue: 0.36, dailyCalls: [120, 140, 130, 125, 110, 135, 130] },
      poolA: { creator: 0.22, notary: 0.05, treasury: 0.05, burn: 0.04 },
      createdAt: new Date(now - 8 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString(),
    },
    {
      id: 'model-nlp-sentiment-v1', slug: 'nlp-sentiment-v1', name: 'NLP Sentiment Analysis v1',
      state: 'DRAFT', originJobId: 'job-2880',
      vtr: { grade: 'SELF_ATTESTED', baseModelId: 'bert-sentiment-v1', ckptHash: '0x...', ppapRootRef: 'ppap-batch-0036' },
      metrics: { best: 0.922, experiments: 4, kept: 3 },
      usage: { totalCalls: 0, totalRevenue: 0, dailyCalls: [0, 0, 0, 0, 0, 0, 0] },
      poolA: { creator: 0, notary: 0, treasury: 0, burn: 0 },
      createdAt: new Date(now - 2 * day).toISOString(), updatedAt: new Date(now - 6 * 3600000).toISOString(),
    },
  ];
  return demoModelsCache;
}

// ── Public API ──

export async function loadModels(): Promise<ModelRecord[]> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchModels(get(apiBase));
    } catch {
      // Fallback to demo on connection failure
    }
  }
  return getDemoModels();
}

export async function loadModel(modelId: string): Promise<ModelRecord | null> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchModel(get(apiBase), modelId);
    } catch {
      // Fallback
    }
  }
  return getDemoModels().find((m) => m.id === modelId) ?? null;
}
