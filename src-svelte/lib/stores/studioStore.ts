import { writable, derived, get } from 'svelte/store';
import { jobStore } from './jobStore.ts';
import { router } from './router.ts';

// ─── Phase State Machine ─────────────────────────
// IDLE → CREATE → SETUP → RUNNING → COMPLETE → PUBLISH → PUBLISHED
export type StudioPhase = 'idle' | 'create' | 'setup' | 'running' | 'complete' | 'publish' | 'published';
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

const INITIAL: StudioState = {
  phase: 'idle',
  createTopic: '',
  createPreset: null,
  resourceMode: 'demo',
  forkSource: null,
  lastActivePhase: null,
  publishedModelId: null,
};

function createStudioStore() {
  const { subscribe, update, set } = writable<StudioState>(INITIAL);

  function setPhase(phase: StudioPhase) {
    update(s => ({ ...s, phase, lastActivePhase: s.phase }));
  }

  return {
    subscribe,

    // ─── Phase transitions ───
    setPhase,

    startCreate(topic?: string) {
      update(s => ({
        ...s,
        phase: 'create',
        createTopic: topic ?? s.createTopic,
        lastActivePhase: s.phase,
      }));
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

    goToSetup() {
      update(s => ({ ...s, phase: 'setup', lastActivePhase: s.phase }));
      router.navigate('ontology');
    },

    startRunning() {
      update(s => ({ ...s, phase: 'running', lastActivePhase: s.phase }));
    },

    completeResearch() {
      update(s => ({ ...s, phase: 'complete', lastActivePhase: s.phase }));
    },

    goToPublish() {
      update(s => ({ ...s, phase: 'publish', lastActivePhase: s.phase }));
    },

    confirmPublished(modelId: string) {
      update(s => ({
        ...s,
        phase: 'published',
        publishedModelId: modelId,
        lastActivePhase: s.phase,
      }));
    },

    goBack() {
      update(s => {
        const back: Record<StudioPhase, StudioPhase> = {
          idle: 'idle',
          create: 'idle',
          setup: 'create',
          running: 'idle',
          complete: 'idle',
          publish: 'complete',
          published: 'idle',
        };
        return { ...s, phase: back[s.phase], lastActivePhase: s.phase };
      });
    },

    reset() {
      set({ ...INITIAL });
    },

    /** Sync phase from jobStore state (e.g. when navigating to research page) */
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

// ─── Derived ─────────────────────────────────────
export const studioPhase = derived(studioStore, s => s.phase);
export const studioTopic = derived(studioStore, s => s.createTopic);
export const isResearchActive = derived(studioStore, s =>
  s.phase === 'running' || s.phase === 'setup'
);
export const isResearchDone = derived(studioStore, s => s.phase === 'complete');
