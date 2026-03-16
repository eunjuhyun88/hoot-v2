/**
 * agentStore.ts — Simplified agent message/action model.
 *
 * Replaced complex intent-matching with card/action based UI.
 * Navigation and research control delegated to dockStore.
 */
import { writable, derived } from 'svelte/store';
import { router } from './router.ts';
import type { AppView } from './router.ts';

// ── Types ──

export interface AgentCard {
  type: 'model' | 'research' | 'gpu' | 'earnings' | 'branch';
  data: Record<string, any>;
}

export interface AgentAction {
  label: string;
  view?: AppView;
  handler?: () => void;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  cards?: AgentCard[];
  actions?: AgentAction[];
  timestamp: number;
}

interface AgentState {
  messages: AgentMessage[];
  sheetOpen: boolean;
  loading: boolean;
  inputFocused: boolean;
}

const initialState: AgentState = {
  messages: [],
  sheetOpen: false,
  loading: false,
  inputFocused: false,
};

// ── Store ──

function createAgentStore() {
  const { subscribe, set, update } = writable<AgentState>(initialState);

  let messageCounter = 0;

  function nextId(): string {
    return `msg-${++messageCounter}-${Date.now()}`;
  }

  return {
    subscribe,

    /** Send user input — generates placeholder agent response */
    async send(input: string) {
      if (!input.trim()) return;

      const userMsg: AgentMessage = {
        id: nextId(),
        role: 'user',
        content: input.trim(),
        timestamp: Date.now(),
      };

      update(s => ({
        ...s,
        messages: [...s.messages, userMsg],
        sheetOpen: true,
        loading: true,
      }));

      // Placeholder response (will be replaced by real API)
      await new Promise(r => setTimeout(r, 800));

      const agentMsg: AgentMessage = {
        id: nextId(),
        role: 'agent',
        content: getPlaceholderResponse(input.trim()),
        timestamp: Date.now(),
      };

      update(s => ({
        ...s,
        messages: [...s.messages, agentMsg],
        loading: false,
      }));
    },

    openSheet() {
      update(s => ({ ...s, sheetOpen: true }));
    },

    closeSheet() {
      update(s => ({ ...s, sheetOpen: false }));
    },

    toggleSheet() {
      update(s => ({ ...s, sheetOpen: !s.sheetOpen }));
    },

    setInputFocused(focused: boolean) {
      update(s => ({ ...s, inputFocused: focused }));
    },

    clearMessages() {
      update(s => ({ ...s, messages: [], sheetOpen: false, loading: false }));
    },

    reset() {
      set(initialState);
    },
  };
}

// ── Placeholder Responses ──

function getPlaceholderResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('btc') || lower.includes('bitcoin')) {
    return 'Would you like to create a Bitcoin price prediction model? Press the button below to start research.';
  }
  if (lower.includes('model')) {
    return 'Loading the list of active models. You can view details in the Models tab.';
  }
  if (lower.includes('gpu') || lower.includes('node')) {
    return 'Checking the status of nodes connected to the network. You can view details in the Network tab.';
  }
  if (lower.includes('earn') || lower.includes('reward')) {
    return 'Retrieving your earnings. You can view detailed records in the Protocol tab.';
  }
  return `Looking into "${input}". Please wait a moment.`;
}

export const agentStore = createAgentStore();

// ── Derived Stores ──

export const agentMessages = derived(agentStore, $s => $s.messages);
export const agentSheetOpen = derived(agentStore, $s => $s.sheetOpen);
export const agentLoading = derived(agentStore, $s => $s.loading);
export const agentInputFocused = derived(agentStore, $s => $s.inputFocused);
