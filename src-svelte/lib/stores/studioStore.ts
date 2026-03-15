/**
 * studioStore.ts — Studio phase state machine.
 *
 * IDLE → STEP1 → STEP2 → [SETUP] → RUNNING → COMPLETE → PUBLISH → PUBLISHED
 *
 * step1: topic input
 * step2: AI recommendation + resource mode
 * setup: advanced ontology configuration (optional)
 */

import { writable, derived, get } from 'svelte/store';
import { jobStore } from './jobStore.ts';

// ── Types ──

export type StudioPhase =
  | 'idle' | 'step1' | 'step2' | 'setup'
  | 'running' | 'complete' | 'publish' | 'published';

export type ResourceMode = 'demo' | 'local' | 'network' | 'hybrid';

export interface StudioState {
  phase: StudioPhase;
  createTopic: string;
  createPreset: string | null;
  resourceMode: ResourceMode;
  forkSource: string | null;
  lastActivePhase: StudioPhase | null;
  publishedModelId: string | null;
}

// ── Initial State ──

const INITIAL: StudioState = {
  phase: 'idle',
  createTopic: '',
  createPreset: null,
  resourceMode: 'demo',
  forkSource: null,
  lastActivePhase: null,
  publishedModelId: null,
};

// ── Store ──

function createStudioStore() {
  const { subscribe, update, set } = writable<StudioState>(INITIAL);

  return {
    subscribe,

    /** Set phase directly */
    setPhase(phase: StudioPhase) {
      update(s => ({ ...s, phase, lastActivePhase: s.phase }));
    },

    setTopic(topic: string) {
      update(s => ({ ...s, createTopic: topic }));
    },

    setPreset(presetId: string | null) {
      update(s => ({ ...s, createPreset: presetId }));
    },

    setResourceMode(mode: ResourceMode) {
      update(s => ({ ...s, resourceMode: mode }));
    },

    setForkSource(source: string | null) {
      update(s => ({ ...s, forkSource: source }));
    },

    // ── Phase Transitions ──

    /** IDLE → STEP1 (topic input) */
    startCreate(topic?: string) {
      update(s => ({
        ...s,
        phase: 'step1',
        createTopic: topic ?? '',
        createPreset: null,
        forkSource: null,
        lastActivePhase: s.phase,
      }));
    },

    /** STEP1 → STEP2 (AI recommendation) */
    goToStep2(topic?: string) {
      update(s => ({
        ...s,
        phase: 'step2',
        createTopic: topic ?? s.createTopic,
        lastActivePhase: s.phase,
      }));
    },

    /** STEP2 → SETUP (advanced ontology config) */
    goToSetup() {
      update(s => ({ ...s, phase: 'setup', lastActivePhase: s.phase }));
    },

    /** STEP2/SETUP → RUNNING */
    startRunning() {
      update(s => ({ ...s, phase: 'running', lastActivePhase: s.phase }));
    },

    /** Launch from dock/agent — bypasses STEP1/STEP2 */
    launchFromDock(topic: string, presetId?: string) {
      update(s => ({
        ...s,
        phase: 'running',
        createTopic: topic,
        createPreset: presetId ?? null,
        lastActivePhase: 'idle',
      }));
    },

    /** RUNNING → COMPLETE */
    completeResearch() {
      update(s => ({ ...s, phase: 'complete', lastActivePhase: s.phase }));
    },

    /** COMPLETE → PUBLISH */
    goToPublish() {
      update(s => ({ ...s, phase: 'publish', lastActivePhase: s.phase }));
    },

    /** PUBLISH → PUBLISHED */
    confirmPublished(modelId: string) {
      update(s => ({
        ...s,
        phase: 'published',
        publishedModelId: modelId,
        lastActivePhase: s.phase,
      }));
    },

    /** Go back one step */
    goBack() {
      update(s => {
        const back: Record<StudioPhase, StudioPhase> = {
          idle: 'idle',
          step1: 'idle',
          step2: 'step1',
          setup: 'step2',
          running: 'running', // can't go back — must stop first
          complete: 'idle',
          publish: 'complete',
          published: 'idle',
        };
        return { ...s, phase: back[s.phase], lastActivePhase: s.phase };
      });
    },

    /** Reset to IDLE */
    reset() {
      set({ ...INITIAL });
    },

    /** Sync phase from jobStore on page entry */
    syncFromJobStore() {
      const job = get(jobStore);
      update(s => {
        if (job.phase === 'running' || job.phase === 'setup') {
          return { ...s, phase: 'running', createTopic: job.topic || s.createTopic };
        }
        if (job.phase === 'complete') {
          return { ...s, phase: 'complete', createTopic: job.topic || s.createTopic };
        }
        return s;
      });
    },
  };
}

export const studioStore = createStudioStore();

// ── Derived ──
export const studioPhase = derived(studioStore, s => s.phase);
export const studioTopic = derived(studioStore, s => s.createTopic);
export const studioResourceMode = derived(studioStore, s => s.resourceMode);
export const isResearchActive = derived(studioStore, s =>
  s.phase === 'running' || s.phase === 'setup'
);
export const isResearchDone = derived(studioStore, s => s.phase === 'complete');
