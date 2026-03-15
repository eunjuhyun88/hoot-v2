<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Node, Worker } from "../utils/types.ts";
  import StatePipeline from "./StatePipeline.svelte";
  import StatePill from "./StatePill.svelte";

  export let node: Node;
  export let worker: Worker | null = null;
  export let selected: boolean = false;
  export let trustScore: number = 75;
  export let showEarnings: boolean = false;

  // Protocol tier derivation from bond amount (simulated)
  type TierInfo = { tier: number; label: string; bond: number; weight: number; mode: string; };
  function deriveTier(nodeId: string): TierInfo {
    const h = Math.abs(hashCode(nodeId));
    const tierRoll = h % 10;
    if (tierRoll >= 8) return { tier: 3, label: 'Enterprise', bond: 10000, weight: 2.5, mode: 'BOTH' };
    if (tierRoll >= 4) return { tier: 2, label: 'Standard', bond: 2000, weight: 1.5, mode: 'TRAINING' };
    return { tier: 1, label: 'Lite', bond: 500, weight: 1.0, mode: 'INFERENCE' };
  }
  function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }
  $: tierInfo = deriveTier(node.id);
  $: effectiveWeight = +(tierInfo.weight * (trustClamped / 100)).toFixed(3);
  $: spotCheckRate = trustClamped < 50 ? 0.50 : trustClamped < 90 ? 0.20 : 0.10;
  $: trustRecovery = Math.floor((100 - trustClamped) / 10);

  // Simulated earnings
  $: earnings = {
    thisJob: +(1.2 + (Math.abs(hashCode(node.id + 'j')) % 200) / 100).toFixed(2),
    today: +(2.5 + (Math.abs(hashCode(node.id + 'd')) % 300) / 100).toFixed(2),
    sevenDay: +(12 + (Math.abs(hashCode(node.id + 'w')) % 800) / 100).toFixed(1),
    total: +(120 + (Math.abs(hashCode(node.id + 't')) % 5000) / 100).toFixed(1),
  };

  const dispatch = createEventDispatcher();

  const stateColor: Record<string, string> = {
    online: 'rgba(80, 170, 255, 0.8)',
    available: '#27864a',
    assigned: '#D97757',
    training: '#D97757',
    cooldown: '#b7860e',
  };

  $: dotColor = stateColor[node.state] ?? '#9a9590';
  $: pillLabel = node.state;
  $: pillColor = stateColor[node.state] ?? '#9a9590';
  $: gpuLabel = worker?.gpuLabel ?? `${node.gpu}x GPU`;
  $: vramLabel = worker?.vramGb ? `${worker.vramGb}GB VRAM` : null;
  $: regionLabel = worker?.region ?? "\u2014";
  $: hasActiveGlow = node.state === 'training' || node.state === 'assigned';
  $: progressPct = worker?.progress != null ? Math.round(worker.progress * 100) : null;
  $: metricDelta = worker?.metricDelta ?? null;
  $: trustClamped = Math.max(0, Math.min(100, trustScore));

  function handleClick() {
    dispatch('select', node.id);
  }
</script>

<button
  class="node-card"
  class:selected
  class:active-glow={hasActiveGlow}
  on:click={handleClick}
  type="button"
>
  {#if hasActiveGlow}
    <div class="glow-bar"></div>
  {/if}

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <span class="state-dot" style:background={dotColor}></span>
      <span class="node-id">{node.id}</span>
    </div>
    <StatePill label={pillLabel} color={pillColor} />
  </div>

  <!-- GPU Info + Tier -->
  <div class="gpu-info">
    <span class="tier-badge" class:tier1={tierInfo.tier===1} class:tier2={tierInfo.tier===2} class:tier3={tierInfo.tier===3}>T{tierInfo.tier}</span>
    <span class="gpu-label">{gpuLabel}</span>
    {#if vramLabel}
      <span class="gpu-sep">&middot;</span>
      <span class="gpu-label">{vramLabel}</span>
    {/if}
    <span class="gpu-sep">&middot;</span>
    <span class="gpu-label">{regionLabel}</span>
    <span class="gpu-sep">&middot;</span>
    <span class="gpu-label mode-label">{tierInfo.mode}</span>
  </div>

  <!-- State Pipeline -->
  <div class="pipeline-section">
    <StatePipeline currentState={node.state} compact={false} />
  </div>

  <!-- Job Info -->
  {#if node.jobId}
    <div class="job-section">
      <div class="job-row">
        <span class="meta-label">JOB</span>
        <span class="meta-value">{node.jobId}</span>
      </div>
      {#if worker?.experimentId}
        <div class="job-row">
          <span class="meta-label">EXP</span>
          <span class="meta-value">{worker.experimentId}</span>
          {#if progressPct !== null}
            <span class="meta-extra">&middot; Training {progressPct}%</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Progress Bar -->
  {#if progressPct !== null}
    <div class="progress-section">
      <div class="progress-track">
        <div class="progress-fill" style:width="{progressPct}%"></div>
      </div>
      <span class="progress-label">{progressPct}%</span>
    </div>
  {/if}

  <!-- Trust Score -->
  <div class="trust-section">
    <div class="trust-header">
      <span class="meta-label">TRUST</span>
      <span class="trust-value">{trustClamped}<span class="trust-max">/100</span></span>
    </div>
    <div class="trust-track">
      <div class="trust-fill" style:width="{trustClamped}%"></div>
    </div>
    <div class="trust-details">
      <span class="td-item">Weight: {effectiveWeight}x</span>
      <span class="td-sep">&middot;</span>
      <span class="td-item">Spot-check: {(spotCheckRate * 100).toFixed(0)}%</span>
      <span class="td-sep">&middot;</span>
      <span class="td-item">Recovery: +{trustRecovery}/job</span>
    </div>
  </div>

  <!-- Earnings (optional) -->
  {#if showEarnings}
    <div class="earnings-section">
      <div class="earnings-header">
        <span class="meta-label">EARNINGS (Pool B)</span>
      </div>
      <div class="earnings-grid">
        <div class="earn-item"><span class="earn-val">{earnings.thisJob}</span><span class="earn-label">This Job</span></div>
        <div class="earn-item"><span class="earn-val">{earnings.today}</span><span class="earn-label">Today</span></div>
        <div class="earn-item"><span class="earn-val">{earnings.sevenDay}</span><span class="earn-label">7 Days</span></div>
        <div class="earn-item"><span class="earn-val accent">{earnings.total}</span><span class="earn-label">Total HOOT</span></div>
      </div>
      <div class="earn-note">GPU 95% / Treasury 5%</div>
    </div>
  {/if}

  <!-- Metric Delta -->
  {#if metricDelta !== null}
    <div class="metric-section">
      <span class="meta-label">METRIC</span>
      <span class="metric-delta" class:positive={metricDelta > 0} class:negative={metricDelta < 0}>
        {metricDelta > 0 ? '+' : ''}{metricDelta.toFixed(4)}
      </span>
    </div>
  {/if}
</button>

<style>
  .node-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-md, 10px);
    cursor: pointer;
    transition: all 180ms ease;
    text-align: left;
    appearance: none;
    font-family: inherit;
    width: 100%;
    overflow: hidden;
  }

  .node-card:hover {
    box-shadow: var(--card-glow, 0 0 0 1px rgba(217, 119, 87, 0.2), 0 4px 16px rgba(217, 119, 87, 0.06));
    transform: translateY(-1px);
  }

  .node-card.selected {
    border-color: var(--accent, #D97757);
    background: rgba(217, 119, 87, 0.03);
  }

  /* Active glow bar at top */
  .glow-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent, #D97757), transparent);
    opacity: 0.7;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .state-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 6px currentColor;
  }

  .node-id {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── GPU Info ── */
  .gpu-info {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .gpu-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    color: var(--text-secondary, #6b6560);
  }

  .gpu-sep {
    font-size: 0.72rem;
    color: var(--text-muted, #9a9590);
  }

  /* ── Pipeline Section ── */
  .pipeline-section {
    padding: 2px 0;
  }

  /* ── Job Section ── */
  .job-section {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .job-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .meta-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted, #9a9590);
    flex-shrink: 0;
  }

  .meta-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary, #2D2D2D);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-extra {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem;
    color: var(--text-secondary, #6b6560);
    white-space: nowrap;
  }

  /* ── Progress Bar ── */
  .progress-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-track {
    flex: 1;
    height: 3px;
    background: var(--border-subtle, #EDEAE5);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(217, 119, 87, 0.3);
    transition: width 300ms ease;
  }

  .progress-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--accent, #D97757);
    flex-shrink: 0;
    min-width: 28px;
    text-align: right;
  }

  /* ── Trust Score ── */
  .trust-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .trust-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .trust-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary, #2D2D2D);
  }

  .trust-max {
    font-weight: 500;
    color: var(--text-muted, #9a9590);
  }

  .trust-track {
    height: 3px;
    background: var(--border-subtle, #EDEAE5);
    border-radius: 2px;
    overflow: hidden;
  }

  .trust-fill {
    height: 100%;
    background: var(--green, #27864a);
    border-radius: 2px;
    transition: width 300ms ease;
  }

  /* ── Metric Delta ── */
  .metric-section {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .metric-delta {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .metric-delta.positive {
    color: var(--green, #27864a);
  }

  .metric-delta.negative {
    color: var(--red, #c0392b);
  }

  /* ── Tier Badge ── */
  .tier-badge {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: var(--radius-pill, 100px);
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .tier-badge.tier1 { background: rgba(154, 149, 144, 0.12); color: var(--text-muted, #9a9590); }
  .tier-badge.tier2 { background: rgba(217, 119, 87, 0.12); color: var(--accent, #D97757); }
  .tier-badge.tier3 { background: rgba(183, 134, 14, 0.12); color: var(--gold, #b7860e); }
  .mode-label { text-transform: uppercase; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em; }

  /* ── Trust Details ── */
  .trust-details {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
    flex-wrap: wrap;
  }
  .td-item {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem;
    color: var(--text-muted, #9a9590);
    font-variant-numeric: tabular-nums;
  }
  .td-sep { color: var(--border, #E5E0DA); font-size: 0.5rem; }

  /* ── Earnings ── */
  .earnings-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 2px;
    border-top: 1px solid var(--border-subtle, #EDEAE5);
  }
  .earnings-header { display: flex; align-items: center; justify-content: space-between; }
  .earnings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 4px;
  }
  .earn-item {
    text-align: center;
    padding: 4px 2px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .earn-val {
    display: block;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary, #2D2D2D);
  }
  .earn-val.accent { color: var(--accent, #D97757); }
  .earn-label {
    display: block;
    font-size: 0.48rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted, #9a9590);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .earn-note {
    font-size: 0.52rem;
    color: var(--text-muted, #9a9590);
    text-align: center;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
</style>
