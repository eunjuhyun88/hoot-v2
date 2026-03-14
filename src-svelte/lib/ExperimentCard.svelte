<script lang="ts">
  import type { Experiment, ExperimentStatus } from "./jobStore.ts";

  export let experiment: Experiment;
  export let index: number = 0;

  const STATUS_CONFIG: Record<ExperimentStatus, { label: string; color: string; bg: string }> = {
    keep:       { label: 'KEEP',     color: '#27864a', bg: 'rgba(39, 134, 74, 0.08)' },
    discard:    { label: 'DISCARD',  color: '#c0392b', bg: 'rgba(192, 57, 43, 0.08)' },
    training:   { label: 'TRAINING', color: '#D97757', bg: 'rgba(217, 119, 87, 0.08)' },
    evaluating: { label: 'EVAL',     color: '#b7860e', bg: 'rgba(183, 134, 14, 0.08)' },
    crash:      { label: 'CRASH',    color: '#8e44ad', bg: 'rgba(142, 68, 173, 0.08)' },
  };

  $: cfg = STATUS_CONFIG[experiment.status];
  $: isRunning = experiment.status === 'training' || experiment.status === 'evaluating';
  $: isKeep = experiment.status === 'keep';
  $: showMetric = experiment.status === 'keep' || experiment.status === 'discard';
  $: deltaStr = experiment.delta > 0
    ? `\u2193${experiment.delta.toFixed(3)}`
    : experiment.delta < 0
      ? `\u2191${Math.abs(experiment.delta).toFixed(3)}`
      : '';

  function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }
</script>

<div
  class="exp-card"
  class:running={isRunning}
  class:keep={isKeep}
  style="--delay: {index * 50}ms"
>
  <!-- Left: ID + Status Badge -->
  <div class="exp-left">
    <span class="exp-id">#{experiment.id}</span>
    <span class="exp-badge" style="color:{cfg.color}; background:{cfg.bg}">
      {#if isRunning}
        <span class="px-eyes">
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none" class="px-eye-icon" shape-rendering="crispEdges">
            <rect x="1" y="1" width="4" height="4" fill="currentColor" class="eye-l"/>
            <rect x="9" y="1" width="4" height="4" fill="currentColor" class="eye-r"/>
            <rect x="2" y="2" width="2" height="2" fill="#fff" class="pupil-l"/>
            <rect x="10" y="2" width="2" height="2" fill="#fff" class="pupil-r"/>
          </svg>
        </span>
      {:else if experiment.status === 'keep'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else if experiment.status === 'discard'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
      {:else if experiment.status === 'crash'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
      {/if}
      {cfg.label}
    </span>
  </div>

  <!-- Middle: Modification + Metric -->
  <div class="exp-mid">
    <span class="exp-mod">{experiment.modification}</span>
    {#if isRunning}
      <div class="exp-progress-wrap">
        <div class="exp-progress-bar">
          <div class="exp-progress-fill" style="width:{experiment.progress}%"></div>
        </div>
        <span class="exp-progress-text">{Math.round(experiment.progress)}%</span>
      </div>
    {:else if showMetric}
      <div class="exp-metric-row">
        <span class="exp-metric">val_bpb: {experiment.metric.toFixed(3)}</span>
        {#if deltaStr}
          <span class="exp-delta" class:positive={experiment.delta > 0} class:negative={experiment.delta < 0}>
            ({deltaStr})
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Right: Node + Duration -->
  <div class="exp-right">
    {#if !isRunning}
      <span class="exp-duration">{formatDuration(experiment.duration)}</span>
    {/if}
    <span class="exp-node">{experiment.nodeId}</span>
  </div>
</div>

<style>
  /* ── Base Card ── */
  .exp-card {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    padding: 10px 14px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-sm, 6px);
    transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, background 200ms ease;
    animation: staggerIn 350ms ease-out both;
    animation-delay: var(--delay, 0ms);
  }

  /* ── Stagger entrance ── */
  @keyframes staggerIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .exp-card:first-child {
    animation: slideIn 300ms ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Better hover: lift + shadow ── */
  .exp-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  /* ── Running state: breathing glow ── */
  .exp-card.running {
    border-color: rgba(217, 119, 87, 0.3);
    background: rgba(217, 119, 87, 0.02);
    box-shadow: 0 0 12px rgba(217, 119, 87, 0.06);
    animation: breathingGlow 2.4s ease-in-out infinite;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes breathingGlow {
    0%, 100% {
      border-color: rgba(217, 119, 87, 0.2);
      box-shadow: 0 0 8px rgba(217, 119, 87, 0.04);
    }
    50% {
      border-color: rgba(217, 119, 87, 0.45);
      box-shadow: 0 0 18px rgba(217, 119, 87, 0.12);
    }
  }

  .exp-card.running:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(217, 119, 87, 0.15), 0 0 18px rgba(217, 119, 87, 0.10);
  }

  /* ── Keep celebration flash ── */
  .exp-card.keep {
    animation: keepFlash 600ms ease-out;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes keepFlash {
    0% {
      background: var(--surface, #fff);
      box-shadow: 0 0 0 rgba(39, 134, 74, 0);
    }
    30% {
      background: rgba(39, 134, 74, 0.08);
      box-shadow: 0 0 16px rgba(39, 134, 74, 0.15);
    }
    100% {
      background: var(--surface, #fff);
      box-shadow: 0 0 0 rgba(39, 134, 74, 0);
    }
  }

  /* ── Left section ── */
  .exp-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    min-width: 120px;
  }

  .exp-id {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted, #9a9590);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-variant-numeric: tabular-nums;
    min-width: 28px;
  }

  .exp-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--radius-sm, 6px);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ── Pixel owl eyes indicator ── */
  .px-eyes {
    display: flex;
    align-items: center;
    line-height: 0;
  }
  .px-eye-icon {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .px-eye-icon .pupil-l,
  .px-eye-icon .pupil-r {
    animation: eyeLook 2.4s ease-in-out infinite;
  }
  .px-eye-icon .pupil-r {
    animation-delay: 0.1s;
  }
  @keyframes eyeLook {
    0%, 40%  { transform: translateX(0); }
    50%      { transform: translateX(1px); }
    60%, 85% { transform: translateX(0); }
    90%      { transform: translateX(-1px); }
    100%     { transform: translateX(0); }
  }

  /* ── Middle section ── */
  .exp-mid {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .exp-mod {
    font-size: 0.78rem;
    color: var(--text-secondary, #6b6560);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .exp-metric-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .exp-metric {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-primary, #2D2D2D);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-variant-numeric: tabular-nums;
  }

  .exp-delta {
    font-size: 0.66rem;
    font-weight: 600;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-variant-numeric: tabular-nums;
  }

  .exp-delta.positive { color: var(--green, #27864a); }
  .exp-delta.negative { color: var(--red, #c0392b); }

  /* ── Progress bar ── */
  .exp-progress-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .exp-progress-bar {
    flex: 1;
    height: 4px;
    background: var(--border-subtle, #EDEAE5);
    border-radius: 2px;
    overflow: hidden;
  }

  .exp-progress-fill {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    transition: width 300ms ease;
    box-shadow: 0 0 6px rgba(217, 119, 87, 0.4);
    position: relative;
    overflow: hidden;
  }

  /* ── Shimmer sweep on progress fill ── */
  .exp-progress-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.45) 40%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0.45) 60%,
      transparent 100%
    );
    animation: shimmerSweep 1.8s ease-in-out infinite;
  }

  @keyframes shimmerSweep {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .exp-progress-text {
    font-size: 0.66rem;
    font-weight: 600;
    color: var(--accent, #D97757);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-variant-numeric: tabular-nums;
    min-width: 28px;
    text-align: right;
  }

  /* ── Right section ── */
  .exp-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }

  .exp-duration {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--text-muted, #9a9590);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-variant-numeric: tabular-nums;
  }

  .exp-node {
    font-size: 0.62rem;
    color: var(--text-muted, #9a9590);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }

  @media (max-width: 600px) {
    .exp-right { display: none; }
    .exp-left { min-width: 90px; }
  }
</style>
