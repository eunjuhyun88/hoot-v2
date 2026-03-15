<script lang="ts">
  import { selectedExperiment } from '../stores/selectionStore.ts';
  import type { JobPhase, BranchInfo, Experiment } from '../stores/jobStore.ts';

  import IdlePanel from './research/IdlePanel.svelte';
  import RunningPanel from './research/RunningPanel.svelte';
  import CompletePanel from './research/CompletePanel.svelte';
  import ExperimentDetail from './research/ExperimentDetail.svelte';

  export let bestMetric: number = Infinity;
  export let phase: JobPhase = 'idle';
  export let topic: string = '';
  export let progress: number = 0;
  export let sessionId: string = '';
  export let branches: BranchInfo[] = [];
  export let experiments: Experiment[] = [];
  export let totalExperiments: number = 0;
  export let expandable = false;
  export let expanded = false;

  $: exp = $selectedExperiment;
</script>

<div class="ctx-panel" class:expanded>
  {#if exp}
    <ExperimentDetail
      {bestMetric}
      {expandable}
      on:retrain
      on:fork
      on:expand
    />
  {:else if phase === 'idle'}
    <IdlePanel
      {expandable}
      on:launch
      on:expand
    />
  {:else if phase === 'running' || phase === 'setup'}
    <RunningPanel
      {topic}
      {progress}
      {sessionId}
      {branches}
      {totalExperiments}
      {bestMetric}
      {experiments}
      {expandable}
      on:submit
      on:expand
    />
  {:else if phase === 'complete'}
    <CompletePanel
      {branches}
      {experiments}
      {bestMetric}
      {totalExperiments}
      {expandable}
      on:newresearch
      on:deploy
      on:retrain
      on:improve
      on:expand
    />
  {/if}
</div>

<style>
  .ctx-panel {
    display: flex; flex-direction: column;
    height: 100%;
    background: #1e1e2e; color: #cdd6f4;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    overflow-y: auto; overflow-x: hidden;
    padding: 0; border-radius: 10px;
  }
  .ctx-panel::-webkit-scrollbar { width: 3px; }
  .ctx-panel::-webkit-scrollbar-thumb { background: #45475a; border-radius: 2px; }

  /* Expanded mode overrides */
  .ctx-panel.expanded :global(.ctx-header) { padding: 14px 18px; gap: 10px; }
  .ctx-panel.expanded :global(.ctx-title) { font-size: 15px; }
  .ctx-panel.expanded :global(.ctx-expand-btn) { width: 32px; height: 32px; border-radius: 10px; }
</style>
