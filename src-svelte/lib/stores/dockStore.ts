/**
 * dockStore.ts — Spotlight-style dock expansion state.
 *
 * Orchestrates dock expansion body and bridges user input
 * to studioStore/jobStore for research lifecycle.
 * Does NOT own lifecycle — reads from jobStore/studioStore.
 */
import { writable, derived, get } from 'svelte/store';
import { jobStore } from './jobStore.ts';
import { studioStore } from './studioStore.ts';
import { toasts } from './toastStore.ts';
import { router } from './router.ts';
import {
  createOntologyFromPreset,
  getEnabledBranches,
  getTotalExperiments,
} from '../data/ontologyData.ts';

// ── Types ──

export type DockExpansion = 'collapsed' | 'expanded';
export type LauncherIntent = 'new' | 'improve' | 'retry';
export type DockContextPhase = 'idle' | 'running' | 'complete';

interface DockState {
  expansion: DockExpansion;
  launcherTopic: string;
  selectedPresetId: string | null;
  intent: LauncherIntent;
}

const initialState: DockState = {
  expansion: 'collapsed',
  launcherTopic: '',
  selectedPresetId: null,
  intent: 'new',
};

// ── Store ──

function createDockStore() {
  const { subscribe, set, update } = writable<DockState>(initialState);

  return {
    subscribe,

    expand(topic?: string, intent: LauncherIntent = 'new') {
      update(s => ({
        ...s,
        expansion: 'expanded',
        launcherTopic: topic ?? s.launcherTopic,
        intent,
        selectedPresetId: intent === 'new' ? s.selectedPresetId : s.selectedPresetId,
      }));
    },

    collapse() {
      update(s => ({ ...s, expansion: 'collapsed' }));
    },

    toggle() {
      update(s => ({
        ...s,
        expansion: s.expansion === 'collapsed' ? 'expanded' : 'collapsed',
      }));
    },

    setTopic(topic: string) {
      update(s => ({ ...s, launcherTopic: topic }));
    },

    selectPreset(presetId: string, topic: string) {
      update(s => ({ ...s, selectedPresetId: presetId, launcherTopic: topic }));
    },

    clearPreset() {
      update(s => ({ ...s, selectedPresetId: null }));
    },

    /** Launch research from dock — bypasses STEP1/STEP2 */
    launch() {
      const state = get({ subscribe });
      if (!state.launcherTopic.trim()) return;

      const topic = state.launcherTopic.trim();

      const ont = state.selectedPresetId
        ? createOntologyFromPreset(state.selectedPresetId)
        : createOntologyFromPreset('balanced');
      const branches = getEnabledBranches(ont).length;
      const totalExp = getTotalExperiments(ont);
      const itersPerBranch = Math.round(totalExp / Math.max(branches, 1));

      jobStore.startJob(topic, branches, itersPerBranch);
      studioStore.launchFromDock(topic, state.selectedPresetId ?? undefined);
      toasts.success('Research Started', 'Your research has been launched');

      update(s => ({ ...s, expansion: 'collapsed' }));
    },

    /** Handle slash commands */
    handleCommand(input: string) {
      const cmd = input.slice(1).split(' ')[0].toLowerCase();
      const job = get(jobStore);

      switch (cmd) {
        case '개선':
        case 'improve': {
          const topic = job.topic || get(studioStore).createTopic;
          update(s => ({ ...s, expansion: 'expanded', launcherTopic: topic, intent: 'improve' }));
          break;
        }
        case '재실행':
        case 'retry': {
          const topic = job.topic || get(studioStore).createTopic;
          update(s => ({ ...s, expansion: 'expanded', launcherTopic: topic, intent: 'retry' }));
          break;
        }
        case '중단':
        case 'stop': {
          if (job.phase === 'running') {
            jobStore.stopJob();
            studioStore.reset();
            toasts.warning('Research Stopped', 'The research has been stopped');
          }
          break;
        }
        case '상태':
        case 'status': {
          if (job.phase === 'running') {
            router.navigate('research');
          } else {
            toasts.info('Status', 'No research is currently in progress');
          }
          break;
        }
        case '배포':
        case 'deploy': {
          if (job.phase === 'complete' || get(studioStore).phase === 'complete') {
            studioStore.goToPublish();
            router.navigate('studio');
          }
          break;
        }
        default:
          toasts.info('Unknown Command', `/${cmd} — type /help to see available commands.`);
      }
    },

    reset() {
      set({ ...initialState });
    },
  };
}

export const dockStore = createDockStore();

// ── Derived Stores ──

export const dockContext = derived<typeof jobStore, DockContextPhase>(
  jobStore,
  ($job) => {
    if ($job.phase === 'running' || $job.phase === 'setup') return 'running';
    if ($job.phase === 'complete') return 'complete';
    return 'idle';
  }
);

export const dockExpansion = derived(dockStore, $s => $s.expansion);
export const dockTopic = derived(dockStore, $s => $s.launcherTopic);
export const dockPresetId = derived(dockStore, $s => $s.selectedPresetId);
export const dockIntent = derived(dockStore, $s => $s.intent);
