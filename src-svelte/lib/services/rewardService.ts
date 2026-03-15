/**
 * rewardService.ts — Async reward data service.
 *
 * Pattern: connected → API fetch → catch → demo fallback.
 */

import { get } from 'svelte/store';
import { connectionMode, apiBase } from '../stores/connectionStore.ts';
import { fetchRewards, fetchRewardSummary } from '../api/client.ts';
import type { RewardEntry, RewardSummary } from '../../../packages/contracts/src/index.ts';

export async function loadRewards(): Promise<RewardEntry[]> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchRewards(get(apiBase));
    } catch {
      // Fallback — let the store provide demo data
    }
  }
  // Return empty — caller should fall back to existing rewardStore demo data
  return [];
}

export async function loadRewardSummary(): Promise<RewardSummary | null> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchRewardSummary(get(apiBase));
    } catch {
      // Fallback
    }
  }
  // Return null — caller uses derived rewardSummary store instead
  return null;
}
