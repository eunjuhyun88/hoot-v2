<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount, onDestroy } from 'svelte';
  import {
    jobStore,
    completedCount, keepCount, discardCount, crashCount,
    trainingCount as trainingCountStore,
    activeNodeCount as activeNodeCountStore,
    metricHistory, latestFinding,
    eventLog, trainingExperiment,
    scatterData, heatmapData, experimentTree,
    branchSummary,
    improvementDelta, bestBranch, isPaused,
  } from '../stores/jobStore.ts';
  import { CATEGORY_COLORS } from '../data/modifications.ts';
  import type { ModCategory } from '../data/modifications.ts';
  import { fmtTime } from '../utils/format.ts';
  import { findBestIndex } from '../utils/chart.ts';
  import { AI_THOUGHTS } from '../data/modifications.ts';
  import PixelOwl from './PixelOwl.svelte';
  import MetricChart from './MetricChart.svelte';
  import ParamScatterChart from './ParamScatterChart.svelte';
  import ModificationHeatmap from './ModificationHeatmap.svelte';
  import ExperimentTree from './ExperimentTree.svelte';
  import DistributedView from './DistributedView.svelte';
  import ResearchTerminal from './ResearchTerminal.svelte';

  const dispatch = createEventDispatcher<{ stop: void }>();

  $: job = $jobStore;
  $: completed = $completedCount;
  $: keeps = $keepCount;
  $: discards = $discardCount;
  $: crashes = $crashCount;
  $: totalTarget = job.totalExperiments;
  $: history = $metricHistory;
  $: chartBestIdx = findBestIndex(history);
  $: hitRate = completed > 0 ? Math.round((keeps / completed) * 100) : 0;
  $: progress = totalTarget > 0 ? Math.round((completed / totalTarget) * 100) : 0;
  $: paused = $isPaused;

  $: etaDisplay = (() => {
    if (completed === 0 || job.elapsedSeconds === 0) return '--';
    const rate = completed / job.elapsedSeconds;
    const remaining = totalTarget - completed;
    const etaSecs = Math.round(remaining / rate);
    const m = Math.floor(etaSecs / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  })();

  export let owlMood: 'idle' | 'research' | 'build' | 'celebrate' | 'sleep' = 'research';

  let aiThoughtIdx = 0;
  let aiThought = AI_THOUGHTS[0];
  let aiThoughtInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    aiThoughtInterval = setInterval(() => {
      aiThoughtIdx = (aiThoughtIdx + 1) % AI_THOUGHTS.length;
      aiThought = AI_THOUGHTS[aiThoughtIdx];
    }, 3200);
  });

  onDestroy(() => {
    clearInterval(aiThoughtInterval);
  });

  let terminalCollapsed = true;
  let analysisTab: 'perf' | 'explore' = 'perf';
</script>

<div class="running">

  <!-- ═══ COMMAND BAR ═══ -->
  <header class="cmd-bar" class:paused>
    <div class="cmd-left">
      <div class="cmd-owl"><PixelOwl size={0.45} mood={owlMood} /></div>
      <div class="cmd-info">
        <div class="cmd-topic-row">
          <span class="status-dot" class:paused></span>
          <span class="cmd-topic">{job.topic}</span>
        </div>
        <p class="cmd-thought">{paused ? 'Paused — waiting for resume...' : aiThought}</p>
      </div>
    </div>

    <div class="cmd-stats">
      <div class="cmd-stat">
        <span class="stat-num">{completed}<span class="stat-dim">/{totalTarget}</span></span>
        <span class="stat-lbl">Experiments</span>
      </div>
      <div class="cmd-divider"></div>
      <div class="cmd-stat">
        <span class="stat-num green">{keeps}</span>
        <span class="stat-lbl">Kept</span>
      </div>
      <div class="cmd-divider"></div>
      <div class="cmd-stat">
        <span class="stat-num">{fmtTime(job.elapsedSeconds)}</span>
        <span class="stat-lbl">Elapsed</span>
      </div>
    </div>

    <div class="cmd-actions">
      <button class="btn-cmd btn-cmd-pause" class:active={paused} on:click={() => jobStore.togglePause()}>
        {#if paused}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
          Resume
        {:else}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="15" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>
          Pause
        {/if}
      </button>
      <button class="btn-cmd btn-cmd-stop" on:click={() => dispatch('stop')}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
        Stop
      </button>
    </div>
  </header>

  <!-- Progress -->
  <div class="progress-strip">
    <div class="progress-track">
      <div class="progress-fill" class:paused style="width: {progress}%"></div>
    </div>
    <div class="progress-meta">
      <span>{progress}%{paused ? ' · PAUSED' : ''}</span>
      <span>ETA {etaDisplay}</span>
      <span>Hit rate {hitRate}%</span>
    </div>
  </div>

  <!-- ═══ HERO ROW ═══ -->
  <div class="hero-row">
    <!-- Hero Metric -->
    <div class="hero-card">
      <div class="hero-top">
        <span class="hero-label">Best val_bpb</span>
        {#if $bestBranch}
          <span class="hero-from">
            <span class="hero-from-dot" style="background: {$bestBranch.color}"></span>
            {$bestBranch.label}
          </span>
        {/if}
      </div>
      <div class="hero-number" class:improving={$improvementDelta !== null && $improvementDelta.percent > 0}>
        {job.bestMetric === Infinity ? '—' : job.bestMetric.toFixed(3)}
      </div>
      {#if $improvementDelta}
        <div class="hero-delta">
          <span class="delta-badge">▼ {$improvementDelta.percent}%</span>
          <span class="delta-from">from {$improvementDelta.baseline.toFixed(3)}</span>
        </div>
      {/if}

      <div class="hero-mini-stats">
        <span class="mini-stat"><span class="mini-val green">{keeps}</span> keep</span>
        <span class="mini-stat"><span class="mini-val">{discards}</span> discard</span>
        <span class="mini-stat"><span class="mini-val red">{crashes}</span> crash</span>
        <span class="mini-stat"><span class="mini-val">{$activeNodeCountStore}</span> nodes</span>
      </div>
    </div>

    <!-- val_bpb Chart -->
    <div class="hero-chart">
      <div class="chart-head">
        <span class="chart-label">val_bpb Descent</span>
        <div class="chart-legend">
          <span class="lg"><span class="lg-dot" style="background:#27864a"></span>keep</span>
          <span class="lg"><span class="lg-line"></span>frontier</span>
          <span class="lg"><span class="lg-line gold"></span>avg</span>
        </div>
      </div>
      <div class="chart-body">
        <MetricChart data={history} bestIndex={chartBestIdx} width={560} height={90} showMovingAvg={true} />
      </div>
    </div>
  </div>

  <!-- ═══ BRANCH CONTROL ═══ -->
  {#if $branchSummary.length > 0}
  <section class="branches">
    <div class="section-head">
      <h3 class="section-title">Research Branches</h3>
      <span class="section-meta">{$branchSummary.filter(b => !b.paused).length}/{$branchSummary.length} active</span>
    </div>
    <div class="branch-grid">
      {#each $branchSummary as branch}
        <div
          class="branch-card"
          class:boosted={branch.boosted}
          class:card-paused={branch.paused}
          class:card-active={branch.active}
        >
          <div class="branch-color-bar" style="background: {CATEGORY_COLORS[branch.category]}"></div>
          <div class="branch-body">
            <div class="branch-top">
              <span class="branch-name">{branch.label}</span>
              {#if branch.active}
                <span class="branch-live">LIVE</span>
              {/if}
            </div>
            <div class="branch-metrics">
              <span class="bm">{branch.hitRate}%<span class="bm-label">hit</span></span>
              <span class="bm">{branch.keeps}<span class="bm-dim">/{branch.total}</span><span class="bm-label">kept</span></span>
              {#if branch.bestMetric < Infinity}
                <span class="bm best">{branch.bestMetric.toFixed(3)}</span>
              {/if}
            </div>
            <div class="branch-actions">
              <button
                class="ba-btn"
                class:ba-boost={!branch.boosted}
                class:ba-boosted={branch.boosted}
                on:click={() => jobStore.toggleCategoryBoost(branch.category)}
              >
                <svg width="8" height="8" viewBox="0 0 16 16" shape-rendering="crispEdges"><polygon points="8,1 10,6 15,6 11,9 12,14 8,11 4,14 5,9 1,6 6,6" fill="currentColor"/></svg>
                {branch.boosted ? 'Boosted' : 'Boost'}
              </button>
              <button
                class="ba-btn"
                class:ba-pause={!branch.paused}
                class:ba-resumed={branch.paused}
                on:click={() => jobStore.toggleCategoryPause(branch.category)}
              >
                {#if branch.paused}
                  <svg width="7" height="7" viewBox="0 0 16 16" fill="none"><polygon points="4,2 14,8 4,14" fill="currentColor"/></svg>
                  Resume
                {:else}
                  <svg width="7" height="7" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="3" height="12" rx="0.5" fill="currentColor"/><rect x="10" y="2" width="3" height="12" rx="0.5" fill="currentColor"/></svg>
                  Pause
                {/if}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>
  {/if}

  <!-- ═══ ANALYSIS (tabbed: 2 at a time) ═══ -->
  <section class="analysis">
    <div class="analysis-tabs">
      <button class="a-tab" class:active={analysisTab === 'perf'} on:click={() => analysisTab = 'perf'}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><circle cx="8" cy="6" r="2.5" fill="currentColor"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>
        Performance
      </button>
      <button class="a-tab" class:active={analysisTab === 'explore'} on:click={() => analysisTab = 'explore'}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="6" height="2" rx="0.5" fill="currentColor"/><rect x="1" y="7" width="10" height="2" rx="0.5" fill="currentColor"/><rect x="1" y="11" width="14" height="2" rx="0.5" fill="currentColor"/></svg>
        Explore
      </button>
    </div>
    <div class="analysis-grid">
      {#if analysisTab === 'perf'}
        <div class="a-card">
          <div class="a-head">
            <span class="a-title">Parameter Scatter</span>
            <span class="a-badge">{$scatterData.length} pts</span>
          </div>
          <div class="a-body">
            <ParamScatterChart data={$scatterData} width={520} height={140} />
          </div>
        </div>

        <div class="a-card">
          <div class="a-head">
            <span class="a-title">Modification Effect</span>
            <span class="a-badge">keep rate</span>
          </div>
          <div class="a-body">
            <ModificationHeatmap data={$heatmapData} width={520} height={140} />
          </div>
        </div>
      {:else}
        <div class="a-card">
          <div class="a-head">
            <span class="a-title">Experiment Lineage</span>
            <span class="a-badge">{$experimentTree.length} nodes</span>
          </div>
          <div class="a-body">
            <ExperimentTree data={$experimentTree} width={520} bestMetric={job.bestMetric} />
          </div>
        </div>

        <div class="a-card">
          <div class="a-head">
            <span class="a-title">Distributed Mesh</span>
            <div class="a-head-right">
              <span class="lg"><span class="lg-dot" style="background:#fbbf24"></span>training</span>
              <span class="lg"><span class="lg-dot" style="background:#27864a"></span>keep</span>
              <span class="lg"><span class="lg-dot" style="background:rgba(154,149,144,0.5)"></span>discard</span>
              <span class="a-badge">{$activeNodeCountStore} nodes</span>
            </div>
          </div>
          <div class="a-body">
            <DistributedView experiments={job.experiments} bestMetric={job.bestMetric} width={520} />
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- ═══ TERMINAL ═══ -->
  <button class="term-toggle" on:click={() => terminalCollapsed = !terminalCollapsed}>
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" shape-rendering="crispEdges">
      <rect x="1" y="1" width="14" height="3" fill="currentColor" opacity="0.8"/>
      <rect x="1" y="5.5" width="9" height="1.5" fill="currentColor" opacity="0.4"/>
      <rect x="1" y="8.5" width="12" height="1.5" fill="currentColor" opacity="0.25"/>
      <rect x="1" y="11.5" width="7" height="1.5" fill="currentColor" opacity="0.15"/>
    </svg>
    <span>{terminalCollapsed ? 'Show' : 'Hide'} Terminal</span>
    {#if $eventLog.length > 0}
      <span class="term-count">{$eventLog.length}</span>
    {/if}
    <span class="term-chevron" class:open={!terminalCollapsed}>&#9662;</span>
  </button>

  {#if !terminalCollapsed}
    <div class="term-wrap">
      <ResearchTerminal eventLog={$eventLog} trainingExp={$trainingExperiment} collapsed={false} />
    </div>
  {/if}
</div>

<style>
  /* ─── Foundation: viewport-fit ─── */
  .running {
    max-width: 1400px; margin: 0 auto;
    padding: 10px 16px 6px;
    height: calc(100vh - 50px);
    display: flex; flex-direction: column; gap: 8px;
    overflow: hidden;
    animation: fadeUp 0.3s ease-out;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ─── COMMAND BAR ─── */
  .cmd-bar {
    display: flex; align-items: center; gap: 16px;
    padding: 8px 16px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    flex-shrink: 0;
    transition: border-color 300ms ease;
  }
  .cmd-bar.paused { border-color: rgba(212,160,23,0.35); }

  .cmd-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .cmd-owl { flex-shrink: 0; }
  .cmd-info { flex: 1; min-width: 0; }
  .cmd-topic-row { display: flex; align-items: center; gap: 6px; }
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: var(--green, #27864a);
    box-shadow: 0 0 7px rgba(39,134,74,0.45);
    animation: pulse 2s ease-in-out infinite;
  }
  .status-dot.paused {
    background: var(--gold, #d4a017);
    box-shadow: 0 0 7px rgba(212,160,23,0.4);
    animation: none;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  .cmd-topic {
    font: 700 0.68rem/1.2 var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-primary, #2D2D2D);
    text-transform: uppercase; letter-spacing: 0.03em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cmd-thought {
    margin: 1px 0 0; padding: 0;
    font: italic 0.56rem/1.2 var(--font-body, 'Inter', sans-serif);
    color: var(--text-muted, #9a9590);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .cmd-stats { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .cmd-stat { display: flex; flex-direction: column; align-items: center; gap: 0; }
  .stat-num {
    font: 700 0.8rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-primary, #2D2D2D); font-variant-numeric: tabular-nums;
    line-height: 1.15;
  }
  .stat-num.green { color: var(--green, #27864a); }
  .stat-dim { font-weight: 400; color: var(--text-muted, #9a9590); font-size: 0.64rem; }
  .stat-lbl {
    font: 600 0.46rem var(--font-mono, 'JetBrains Mono', monospace);
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-muted, #9a9590);
  }
  .cmd-divider { width: 1px; height: 24px; background: var(--border, #E5E0DA); }

  .cmd-actions { display: flex; gap: 5px; flex-shrink: 0; }
  .btn-cmd {
    appearance: none; border: 1px solid; border-radius: 7px;
    font: 700 0.58rem var(--font-mono, 'JetBrains Mono', monospace);
    padding: 5px 10px; cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    transition: all 150ms ease;
  }
  .btn-cmd-pause {
    border-color: rgba(183,134,14,0.3); background: rgba(183,134,14,0.04);
    color: var(--gold, #b7860e);
  }
  .btn-cmd-pause:hover { background: rgba(183,134,14,0.1); }
  .btn-cmd-pause.active {
    border-color: rgba(39,134,74,0.35); background: rgba(39,134,74,0.06);
    color: var(--green, #27864a);
  }
  .btn-cmd-pause.active:hover { background: rgba(39,134,74,0.12); }
  .btn-cmd-stop {
    border-color: rgba(192,57,43,0.2); background: rgba(192,57,43,0.03);
    color: var(--red, #c0392b);
  }
  .btn-cmd-stop:hover { background: rgba(192,57,43,0.08); }

  /* ─── PROGRESS ─── */
  .progress-strip { flex-shrink: 0; }
  .progress-track {
    height: 4px; background: var(--border-subtle, #EDEAE5);
    border-radius: 4px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 4px;
    background: linear-gradient(90deg, var(--accent, #D97757), #E8956E);
    transition: width 600ms ease;
    box-shadow: 0 0 8px rgba(217,119,87,0.2);
  }
  .progress-fill.paused {
    background: linear-gradient(90deg, var(--gold, #d4a017), #e8c44e);
    box-shadow: 0 0 8px rgba(212,160,23,0.2);
  }
  .progress-meta {
    display: flex; justify-content: space-between; margin-top: 3px;
    font: 500 0.5rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
  }

  /* ─── HERO ROW ─── */
  .hero-row {
    display: grid; grid-template-columns: 220px 1fr; gap: 8px;
    flex-shrink: 0;
  }

  .hero-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 12px; padding: 10px 14px;
    display: flex; flex-direction: column; gap: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .hero-top { display: flex; justify-content: space-between; align-items: center; }
  .hero-label {
    font: 600 0.5rem var(--font-mono, 'JetBrains Mono', monospace);
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text-muted, #9a9590);
  }
  .hero-from {
    display: flex; align-items: center; gap: 4px;
    font: 600 0.48rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-secondary, #6b6560);
  }
  .hero-from-dot { width: 7px; height: 7px; border-radius: 50%; }
  .hero-number {
    font: 800 1.8rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-primary, #2D2D2D);
    font-variant-numeric: tabular-nums;
    line-height: 1; letter-spacing: -0.02em;
    transition: color 400ms ease;
  }
  .hero-number.improving { color: var(--green, #27864a); }
  .hero-delta {
    display: flex; align-items: center; gap: 6px;
  }
  .delta-badge {
    font: 700 0.6rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--green, #27864a);
    background: rgba(39,134,74,0.08);
    padding: 1px 6px; border-radius: 5px;
  }
  .delta-from {
    font: 500 0.5rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
  }
  .hero-mini-stats {
    display: flex; gap: 10px; margin-top: 4px; padding-top: 6px;
    border-top: 1px solid var(--border-subtle, #EDEAE5);
  }
  .mini-stat {
    font: 500 0.5rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
  }
  .mini-val {
    font-weight: 700; color: var(--text-primary, #2D2D2D);
    margin-right: 2px;
  }
  .mini-val.green { color: var(--green, #27864a); }
  .mini-val.red { color: var(--red, #c0392b); }

  /* Hero chart */
  .hero-chart {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    display: flex; flex-direction: column;
  }
  .chart-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .chart-label {
    font: 700 0.54rem var(--font-mono, 'JetBrains Mono', monospace);
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-secondary, #6b6560);
  }
  .chart-legend { display: flex; gap: 10px; }
  .chart-body {
    padding: 6px 10px 4px;
    display: flex; justify-content: center; flex: 1;
  }
  .chart-body :global(svg) { width: 100%; height: auto; }

  /* ─── LEGEND ─── */
  .lg {
    display: inline-flex; align-items: center; gap: 3px;
    font: 500 0.46rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
  }
  .lg-dot { width: 5px; height: 5px; border-radius: 50%; }
  .lg-line { width: 10px; height: 2px; border-radius: 1px; background: #27864a; }
  .lg-line.gold { background: #b7860e; }

  /* ─── BRANCHES ─── */
  .branches {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 12px; padding: 8px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    flex-shrink: 0;
  }
  .section-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 6px;
  }
  .section-title {
    font: 700 0.58rem var(--font-mono, 'JetBrains Mono', monospace);
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-secondary, #6b6560); margin: 0;
  }
  .section-meta {
    font: 500 0.5rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
  }
  .branch-grid {
    display: flex; gap: 6px;
    overflow-x: auto; scrollbar-width: none;
  }
  .branch-grid::-webkit-scrollbar { display: none; }

  .branch-card {
    display: flex; border-radius: 8px;
    border: 1px solid var(--border-subtle, #EDEAE5);
    overflow: hidden; transition: all 200ms ease;
    flex-shrink: 0; min-width: 150px;
  }
  .branch-card:hover { border-color: var(--border, #E5E0DA); box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
  .branch-card.boosted {
    border-color: rgba(183,134,14,0.45);
    background: rgba(183,134,14,0.02);
  }
  .branch-card.card-paused { opacity: 0.4; }
  .branch-card.card-active { border-color: rgba(39,134,74,0.3); }
  .branch-color-bar { width: 3px; flex-shrink: 0; }
  .branch-body { padding: 6px 8px; flex: 1; min-width: 0; }
  .branch-top { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
  .branch-name {
    font: 700 0.56rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-primary, #2D2D2D);
  }
  .branch-live {
    font: 700 0.4rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--green, #27864a); background: rgba(39,134,74,0.1);
    padding: 0 4px; border-radius: 3px;
    animation: pulse 2s ease-in-out infinite;
  }
  .branch-metrics {
    display: flex; gap: 6px; margin-bottom: 4px;
    font: 500 0.48rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
  }
  .bm { display: inline-flex; align-items: baseline; gap: 1px; }
  .bm-label { font-size: 0.42rem; margin-left: 1px; }
  .bm-dim { font-weight: 400; }
  .bm.best { color: var(--green, #27864a); font-weight: 700; }

  .branch-actions { display: flex; gap: 4px; }
  .ba-btn {
    appearance: none; border: 1px solid transparent;
    background: rgba(0,0,0,0.025); border-radius: 5px;
    font: 600 0.46rem var(--font-mono, 'JetBrains Mono', monospace);
    padding: 2px 6px; cursor: pointer;
    display: flex; align-items: center; gap: 3px;
    color: var(--text-muted, #9a9590);
    transition: all 150ms ease;
  }
  .ba-btn:hover { background: rgba(0,0,0,0.055); }
  .ba-boosted {
    color: var(--gold, #b7860e); border-color: rgba(183,134,14,0.35);
    background: rgba(183,134,14,0.06);
  }
  .ba-resumed {
    color: var(--green, #27864a); border-color: rgba(39,134,74,0.25);
    background: rgba(39,134,74,0.04);
  }

  /* ─── ANALYSIS (tabbed) ─── */
  .analysis {
    flex: 1; min-height: 0;
    display: flex; flex-direction: column;
  }
  .analysis-tabs {
    display: flex; gap: 4px; margin-bottom: 4px; flex-shrink: 0;
  }
  .a-tab {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: transparent; border-radius: 6px;
    font: 600 0.5rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
    padding: 3px 10px; cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    transition: all 150ms ease;
  }
  .a-tab:hover { background: rgba(0,0,0,0.03); }
  .a-tab.active {
    background: var(--surface, #fff);
    border-color: var(--border, #E5E0DA);
    color: var(--text-primary, #2D2D2D);
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .analysis-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    flex: 1; min-height: 0;
  }
  .a-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    min-width: 0; min-height: 0;
    display: flex; flex-direction: column;
  }
  .a-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    flex-shrink: 0;
  }
  .a-head-right { display: flex; align-items: center; gap: 8px; }
  .a-title {
    font: 700 0.54rem var(--font-mono, 'JetBrains Mono', monospace);
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-secondary, #6b6560);
  }
  .a-badge {
    font: 600 0.46rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
    background: rgba(0,0,0,0.03); padding: 1px 6px; border-radius: 100px;
  }
  .a-body {
    padding: 4px 8px 2px;
    display: flex; justify-content: center; align-items: center;
    flex: 1; min-height: 0; overflow: hidden;
  }
  .a-body :global(svg) { width: 100%; height: auto; max-height: 100%; }

  /* ─── TERMINAL ─── */
  .term-toggle {
    appearance: none; width: 100%;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: rgba(0,0,0,0.012); border-radius: 8px;
    font: 600 0.54rem var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
    padding: 5px 14px; cursor: pointer;
    display: flex; align-items: center; gap: 7px;
    transition: all 150ms ease;
    flex-shrink: 0;
  }
  .term-toggle:hover { background: rgba(0,0,0,0.03); }
  .term-count {
    background: var(--accent, #D97757); color: #fff;
    font-size: 0.44rem; font-weight: 700;
    padding: 0 6px; border-radius: 100px;
  }
  .term-chevron {
    margin-left: auto; font-size: 0.6rem;
    transition: transform 200ms ease;
  }
  .term-chevron.open { transform: rotate(180deg); }
  .term-wrap {
    border-radius: 10px; overflow: hidden;
    max-height: 240px; flex-shrink: 0;
  }

  /* ─── Hide footer when running ─── */
  :global(.app-shell:has(.running) > footer) { display: none !important; }
  :global(.app-shell:has(.running) .autoresearch) { min-height: 0; }

  /* ─── Responsive ─── */
  @media (max-width: 900px) {
    .running { height: auto; overflow: auto; padding: 10px 12px 32px; }
    .cmd-bar { flex-wrap: wrap; gap: 8px; }
    .cmd-stats { order: 3; width: 100%; justify-content: space-around; }
    .hero-row { grid-template-columns: 1fr; }
    .analysis-grid { grid-template-columns: 1fr; }
    .branch-grid { flex-wrap: wrap; }
  }
  @media (max-width: 600px) {
    .running { padding: 8px 8px 24px; gap: 6px; }
    .cmd-actions { width: 100%; justify-content: stretch; }
    .cmd-actions .btn-cmd { flex: 1; justify-content: center; }
    .hero-number { font-size: 1.4rem; }
  }
</style>
