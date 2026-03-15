/**
 * protocolService.ts — Async protocol data service.
 *
 * Pattern: connected → API fetch → catch → demo fallback.
 */

import { get } from 'svelte/store';
import { connectionMode, apiBase } from '../stores/connectionStore.ts';
import {
  fetchProtocolSummary,
  fetchProtocolBonds,
  fetchProtocolEvents,
} from '../api/client.ts';
import {
  BOND_TIERS,
  ACTIVE_BONDS,
  BURN_CONVERSIONS,
  PPAP_STAGES,
  FLOW_NODES,
  EVENT_FEED,
  SIMULATED_BALANCE,
  MAU_TARGET,
  TRUST_SCORE_TARGET,
} from '../data/protocolData.ts';
import type {
  BondTier,
  ActiveBond,
  BurnConversion,
  PpapStage,
  FlowNode,
  ProtocolEvent,
} from '../../../packages/contracts/src/index.ts';

export interface ProtocolFullSummary {
  bondTiers: BondTier[];
  activeBonds: ActiveBond[];
  burnConversions: BurnConversion[];
  ppapStages: PpapStage[];
  flowNodes: FlowNode[];
  balance: number;
  mauTarget: number;
  trustScoreTarget: number;
}

function getDemoSummary(): ProtocolFullSummary {
  return {
    bondTiers: [...BOND_TIERS],
    activeBonds: [...ACTIVE_BONDS],
    burnConversions: [...BURN_CONVERSIONS],
    ppapStages: [...PPAP_STAGES],
    flowNodes: [...FLOW_NODES],
    balance: SIMULATED_BALANCE,
    mauTarget: MAU_TARGET,
    trustScoreTarget: TRUST_SCORE_TARGET,
  };
}

export async function loadProtocolSummary(): Promise<ProtocolFullSummary> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchProtocolSummary(get(apiBase));
    } catch {
      // Fallback
    }
  }
  return getDemoSummary();
}

export async function loadProtocolBonds(): Promise<ActiveBond[]> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchProtocolBonds(get(apiBase));
    } catch {
      // Fallback
    }
  }
  return [...ACTIVE_BONDS];
}

export async function loadProtocolEvents(): Promise<ProtocolEvent[]> {
  if (get(connectionMode) === 'connected') {
    try {
      return await fetchProtocolEvents(get(apiBase));
    } catch {
      // Fallback
    }
  }
  return [...EVENT_FEED];
}
