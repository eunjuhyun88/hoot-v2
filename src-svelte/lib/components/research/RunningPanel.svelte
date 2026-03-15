<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BranchInfo } from '../../stores/jobStore.ts';
  import TerminalHeader from './TerminalHeader.svelte';
  import PixelOwl from '../PixelOwl.svelte';

  export let topic: string = '';
  export let progress: number = 0;
  export let sessionId: string = '';
  export let branches: BranchInfo[] = [];
  export let totalExperiments: number = 0;
  export let bestMetric: number = Infinity;
  export let experiments: { status: string }[] = [];
  export let expandable = false;

  const dispatch = createEventDispatcher<{
    submit: { text: string; parentId: number | null };
    expand: void;
  }>();

  let submitText = '';

  $: totalDone = experiments.filter(e => e.status !== 'training').length;
  $: totalKeeps = experiments.filter(e => e.status === 'keep').length;
  $: totalCrashes = experiments.filter(e => e.status === 'crash').length;
  $: sortedBranches = [...branches].sort((a, b) => a.bestMetric - b.bestMetric);

  function handleSubmit() {
    if (!submitText.trim()) return;
    dispatch('submit', { text: submitText.trim(), parentId: null });
    submitText = '';
  }

  function handleSubmitKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  }
</script>

<TerminalHeader title="Research Running" showExpand={expandable} on:expand>
  <span slot="before" class="owl-mini"><PixelOwl size={0.2} mood="research" /></span>
  <span slot="after" class="progress-badge">{progress}%</span>
</TerminalHeader>

<div class="run-meta">
  <div class="run-topic">{topic}</div>
  {#if sessionId}<div class="run-session">Session #{sessionId}</div>{/if}
  <div class="run-progress-bar"><div class="run-progress-fill" style="width: {progress}%"></div></div>
  <div class="run-counts">
    <span>{totalDone}/{totalExperiments} experiments</span>
    <span class="sep">&middot;</span>
    <span class="keep-count">{totalKeeps} keeps</span>
    <span class="sep">&middot;</span>
    <span class="crash-count">{totalCrashes} crashes</span>
  </div>
</div>

{#if sortedBranches.length > 0}
  <div class="branch-section">
    <span class="section-label">Branch Status</span>
    <div class="branch-list">
      {#each sortedBranches as br, i}
        <div class="branch-row" class:best={i === 0 && br.bestMetric < Infinity}>
          <span class="br-rank">#{i + 1}</span>
          <span class="br-name" title={br.label}>{br.label}</span>
          <span class="br-metric">{br.bestMetric < Infinity ? br.bestMetric.toFixed(4) : '\u2014'}</span>
          <span class="br-stat">{br.keeps}k {br.crashes}c</span>
          {#if br.active}<span class="br-active">&bull;</span>{/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

{#if bestMetric < Infinity}
  <div class="best-banner">
    <span class="best-icon">&starf;</span>
    <span class="best-label">Current Best</span>
    <span class="best-val">{bestMetric.toFixed(4)}</span>
  </div>
{/if}

<div class="submit-section">
  <span class="submit-label">Submit experiment idea</span>
  <div class="submit-row">
    <input type="text" class="submit-input" bind:value={submitText} placeholder="Try a different approach..." on:keydown={handleSubmitKeydown} />
    <button class="action-btn small" on:click={handleSubmit} disabled={!submitText.trim()}>Send</button>
  </div>
  <span class="submit-hint">Click any result to inspect & fork</span>
</div>

<style>
  .owl-mini { width: 20px; height: 20px; overflow: hidden; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .owl-mini :global(.pixel-owl) { transform: translate(-50%, -50%); position: relative; left: 50%; top: 50%; }
  .progress-badge { margin-left: auto; font: 700 11px/1 'SF Mono', monospace; color: #fab387; font-variant-numeric: tabular-nums; }

  .run-meta { padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid #313244; }
  .run-topic { font: 600 12px/1.3 'SF Mono', monospace; color: #cdd6f4; }
  .run-session { font: 400 10px/1 'SF Mono', monospace; color: #585b70; }
  .run-progress-bar { width: 100%; height: 4px; border-radius: 2px; background: #313244; overflow: hidden; }
  .run-progress-fill { height: 100%; border-radius: 2px; background: #fab387; transition: width 300ms ease; }
  .run-counts { display: flex; gap: 4px; align-items: center; font: 500 10px/1 'SF Mono', monospace; color: #7f849c; }
  .sep { color: #45475a; }
  .keep-count { color: #a6e3a1; }
  .crash-count { color: #f38ba8; }

  .branch-section { padding: 8px 14px; display: flex; flex-direction: column; gap: 4px; }
  .section-label { font: 600 9px/1 'SF Mono', monospace; color: #7f849c; text-transform: uppercase; letter-spacing: 0.06em; }
  .branch-list { display: flex; flex-direction: column; gap: 2px; }
  .branch-row {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 6px; border-radius: 4px;
    font: 500 11px/1.3 'SF Mono', monospace; transition: background 150ms;
  }
  .branch-row:hover { background: rgba(205,214,244,0.03); }
  .branch-row.best { background: rgba(166,227,161,0.06); }
  .br-rank { font: 700 10px/1 'SF Mono', monospace; color: #585b70; min-width: 18px; }
  .br-name { color: #bac2de; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
  .br-metric { font: 700 11px/1 'SF Mono', monospace; color: #a6e3a1; font-variant-numeric: tabular-nums; }
  .br-stat { font: 400 9px/1 'SF Mono', monospace; color: #585b70; min-width: 30px; text-align: right; }
  .br-active { color: #a6e3a1; font-size: 6px; }
  @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(166,227,161,0.3); } 50% { box-shadow: 0 0 0 4px rgba(166,227,161,0); } }

  .best-banner {
    display: flex; align-items: center; gap: 6px;
    margin: 4px 14px; padding: 6px 10px;
    background: rgba(249,226,175,0.05); border: 1px solid rgba(249,226,175,0.15); border-radius: 6px;
  }
  .best-icon { color: #f9e2af; font-size: 12px; }
  .best-label { font: 600 10px/1 'SF Mono', monospace; color: #7f849c; flex: 1; }
  .best-val { font: 800 13px/1 'SF Mono', monospace; color: #f9e2af; font-variant-numeric: tabular-nums; }

  .submit-section { margin-top: auto; padding: 8px 14px; border-top: 1px solid #313244; display: flex; flex-direction: column; gap: 6px; }
  .submit-label { font: 600 9px/1 'SF Mono', monospace; color: #7f849c; text-transform: uppercase; letter-spacing: 0.04em; }
  .submit-row { display: flex; gap: 4px; }
  .submit-input {
    flex: 1; font: 400 11px/1 'SF Mono', monospace;
    color: #cdd6f4; background: #313244;
    border: 1px solid #45475a; border-radius: 6px;
    padding: 6px 10px; outline: none; transition: border-color 200ms;
  }
  .submit-input:focus { border-color: #89b4fa; }
  .submit-input::placeholder { color: #585b70; }
  .submit-hint { font: 400 10px/1 'SF Mono', monospace; color: #45475a; }

  .action-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font: 600 12px/1 'SF Mono', monospace;
    padding: 8px 16px; border-radius: 6px;
    border: none; cursor: pointer; transition: all 200ms;
  }
  .action-btn.small { padding: 6px 12px; font-size: 11px; border-radius: 6px; background: #313244; color: #cdd6f4; }
  .action-btn.small:hover:not(:disabled) { background: #45475a; }
  .action-btn.small:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
