<script lang="ts">
  import { jobStore, completedCount, keepCount, discardCount, metricHistory } from './jobStore.ts';
  import MetricChart from './MetricChart.svelte';
  import PixelOwl from './PixelOwl.svelte';

  export let onNewResearch: () => void = () => {};
  export let onViewDetails: () => void = () => {};

  $: job = $jobStore;
  $: completed = $completedCount;
  $: keeps = $keepCount;
  $: discards = $discardCount;
  $: crashes = job.experiments.filter(e => e.status === 'crash').length;
  $: bestMetric = job.bestMetric;
  $: activeNodes = new Set(job.experiments.map(e => e.nodeId)).size;
  $: history = $metricHistory;

  // Chart best index
  $: chartBestIdx = (() => {
    if (!history.length) return -1;
    let minVal = Infinity;
    let minIdx = -1;
    history.forEach((d, i) => { if (d.y < minVal) { minVal = d.y; minIdx = i; } });
    return minIdx;
  })();

  function fmtTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // Generate a model name from topic
  $: modelName = job.topic
    ? job.topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Predictor'
    : 'Trained Model';

  // Generate model hash
  $: modelHash = Math.random().toString(36).slice(2, 10);

  // Best experiment details
  $: bestExp = job.experiments.find(e => e.metric === bestMetric && e.status === 'keep');

  // Completion timestamp
  $: completedAt = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  })();

  // Hit rate
  $: hitRate = completed > 0 ? Math.round((keeps / completed) * 100) : 0;
</script>

<div class="complete-state">
  <!-- Terminal: Research Complete -->
  <div class="complete-terminal">
    <div class="ct-chrome">
      <div class="ct-dots">
        <span class="ct-dot red"></span>
        <span class="ct-dot yellow"></span>
        <span class="ct-dot green"></span>
      </div>
      <span class="ct-title">hoot — research complete</span>
      <span class="ct-badge">DONE</span>
    </div>
    <div class="ct-body">
      <!-- Completion header with owl -->
      <div class="ct-header">
        <div class="ct-owl">
          <PixelOwl size={0.55} mood="celebrate" />
        </div>
        <div class="ct-header-text">
          <div class="ct-line system">
            <span class="ct-prompt">❯</span>
            <span class="ct-cmd">hoot research --status</span>
          </div>
          <div class="ct-line success">
            <span class="ct-icon">✓</span> Research complete — model ready
          </div>
          <div class="ct-line dim">
            topic="{job.topic}" · finished {completedAt}
          </div>
        </div>
      </div>

      <!-- results.tsv summary -->
      <div class="ct-section">
        <div class="ct-section-label">results.tsv</div>
        <div class="ct-table">
          <div class="ct-table-header">
            <span class="ct-th" style="min-width:70px">STATUS</span>
            <span class="ct-th" style="min-width:40px">COUNT</span>
            <span class="ct-th" style="flex:1">RATE</span>
          </div>
          <div class="ct-table-row">
            <span class="ct-td status-keep">● keep</span>
            <span class="ct-td val">{keeps}</span>
            <span class="ct-td">
              <span class="ct-bar-track">
                <span class="ct-bar-fill keep" style="width:{completed > 0 ? (keeps/completed)*100 : 0}%"></span>
              </span>
              <span class="ct-bar-pct">{hitRate}%</span>
            </span>
          </div>
          <div class="ct-table-row">
            <span class="ct-td status-discard">● discard</span>
            <span class="ct-td val">{discards}</span>
            <span class="ct-td">
              <span class="ct-bar-track">
                <span class="ct-bar-fill discard" style="width:{completed > 0 ? (discards/completed)*100 : 0}%"></span>
              </span>
              <span class="ct-bar-pct">{completed > 0 ? Math.round((discards/completed)*100) : 0}%</span>
            </span>
          </div>
          {#if crashes > 0}
          <div class="ct-table-row">
            <span class="ct-td status-crash">● crash</span>
            <span class="ct-td val">{crashes}</span>
            <span class="ct-td">
              <span class="ct-bar-track">
                <span class="ct-bar-fill crash" style="width:{completed > 0 ? (crashes/completed)*100 : 0}%"></span>
              </span>
              <span class="ct-bar-pct">{completed > 0 ? Math.round((crashes/completed)*100) : 0}%</span>
            </span>
          </div>
          {/if}
          <div class="ct-table-sep"></div>
          <div class="ct-table-row total">
            <span class="ct-td">TOTAL</span>
            <span class="ct-td val">{completed}</span>
            <span class="ct-td"><span class="ct-bar-pct">100%</span></span>
          </div>
        </div>
      </div>

      <!-- Best model output -->
      <div class="ct-section">
        <div class="ct-section-label">best_model</div>
        <div class="ct-result-block">
          <div class="ct-result-row">
            <span class="ct-result-key">model_id</span>
            <span class="ct-result-val">{modelHash}</span>
          </div>
          <div class="ct-result-row highlight">
            <span class="ct-result-key">val_bpb</span>
            <span class="ct-result-val accent">{bestMetric === Infinity ? '—' : bestMetric.toFixed(4)}</span>
          </div>
          {#if bestExp}
          <div class="ct-result-row">
            <span class="ct-result-key">best_change</span>
            <span class="ct-result-val">{bestExp.modification}</span>
          </div>
          {/if}
          <div class="ct-result-row">
            <span class="ct-result-key">nodes_used</span>
            <span class="ct-result-val">{activeNodes}</span>
          </div>
          <div class="ct-result-row">
            <span class="ct-result-key">duration</span>
            <span class="ct-result-val">{fmtTime(job.elapsedSeconds)}</span>
          </div>
          <div class="ct-result-row">
            <span class="ct-result-key">experiments</span>
            <span class="ct-result-val">{completed} ({keeps} kept, {discards} discarded{crashes > 0 ? `, ${crashes} crashed` : ''})</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Chart: Final Descent -->
  <div class="complete-chart">
    <div class="cc-head">
      <h3 class="cc-title">val_bpb Descent</h3>
      <div class="cc-legend">
        <span class="cc-leg"><span class="cc-dot green"></span>keep</span>
        <span class="cc-leg"><span class="cc-dot gray"></span>discard</span>
        <span class="cc-leg"><span class="cc-line"></span>frontier</span>
      </div>
    </div>
    <div class="cc-chart-wrap">
      <MetricChart data={history} bestIndex={chartBestIdx} width={520} height={180} />
    </div>
  </div>

  <!-- Stats pills -->
  <div class="complete-pills">
    <span class="cp-pill">
      <span class="cp-pill-val green">{keeps}</span>
      <span class="cp-pill-label">kept</span>
    </span>
    <span class="cp-pill">
      <span class="cp-pill-val">{completed}</span>
      <span class="cp-pill-label">experiments</span>
    </span>
    <span class="cp-pill">
      <span class="cp-pill-val accent">{bestMetric === Infinity ? '—' : bestMetric.toFixed(3)}</span>
      <span class="cp-pill-label">best bpb</span>
    </span>
    <span class="cp-pill">
      <span class="cp-pill-val">{activeNodes}</span>
      <span class="cp-pill-label">nodes</span>
    </span>
    <span class="cp-pill">
      <span class="cp-pill-val">{fmtTime(job.elapsedSeconds)}</span>
      <span class="cp-pill-label">elapsed</span>
    </span>
    <span class="cp-pill">
      <span class="cp-pill-val green">{hitRate}%</span>
      <span class="cp-pill-label">hit rate</span>
    </span>
  </div>

  <!-- Actions -->
  <div class="complete-actions">
    <button class="ca-btn primary" on:click={onViewDetails}>
      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" class="px-icon" shape-rendering="crispEdges">
        <rect x="1" y="8" width="2" height="4" fill="currentColor"/>
        <rect x="5" y="4" width="2" height="8" fill="currentColor"/>
        <rect x="9" y="1" width="2" height="11" fill="currentColor"/>
      </svg>
      View Full Benchmark
    </button>
    <button class="ca-btn secondary" on:click={onNewResearch}>
      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" class="px-icon" shape-rendering="crispEdges">
        <rect x="5" y="1" width="2" height="10" fill="currentColor"/>
        <rect x="1" y="5" width="10" height="2" fill="currentColor"/>
      </svg>
      New Research
    </button>
  </div>
</div>

<style>
  .complete-state {
    max-width: 640px;
    margin: 0 auto;
    padding: 24px 16px 48px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: complete-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes complete-enter {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ═══════════════════════════════
     TERMINAL
     ═══════════════════════════════ */
  .complete-terminal {
    background: #0D0D14;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255,255,255,0.06);
    animation: complete-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .ct-chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .ct-dots { display: flex; gap: 5px; }
  .ct-dot { width: 10px; height: 10px; border-radius: 50%; }
  .ct-dot.red { background: #FF5F57; }
  .ct-dot.yellow { background: #FEBC2E; }
  .ct-dot.green { background: #28C840; }
  .ct-title {
    margin-left: 8px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.04em;
  }
  .ct-badge {
    margin-left: auto;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #4ade80;
    background: rgba(39, 134, 74, 0.15);
    padding: 2px 8px;
    border-radius: 100px;
  }

  .ct-body {
    padding: 16px 18px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem;
    line-height: 1.7;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* Header with owl */
  .ct-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ct-owl {
    flex-shrink: 0;
    filter: drop-shadow(0 0 12px rgba(39, 134, 74, 0.2));
    animation: owl-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
  }
  @keyframes owl-bounce {
    from { opacity: 0; transform: scale(0.7) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .ct-header-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ct-line { color: rgba(255,255,255,0.5); }
  .ct-line.system { color: rgba(255,255,255,0.7); }
  .ct-line.success { color: #4ade80; font-weight: 600; }
  .ct-line.dim { color: rgba(255,255,255,0.25); font-size: 0.6rem; }
  .ct-prompt { color: #D97757; margin-right: 8px; font-weight: 700; }
  .ct-cmd { color: rgba(255,255,255,0.7); }
  .ct-icon { margin-right: 4px; }

  /* Section */
  .ct-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ct-section-label {
    font-size: 0.56rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.2);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding-bottom: 4px;
  }

  /* Results table */
  .ct-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ct-table-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
  }
  .ct-th {
    font-size: 0.52rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.2);
  }
  .ct-table-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 3px 0;
  }
  .ct-table-row.total {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding-top: 6px;
    margin-top: 2px;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }
  .ct-table-sep { height: 0; }
  .ct-td {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.5);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ct-td:first-child { min-width: 70px; }
  .ct-td.val { min-width: 40px; font-weight: 700; color: rgba(255,255,255,0.7); font-variant-numeric: tabular-nums; }
  .ct-td:last-child { flex: 1; }

  .ct-td.status-keep { color: #4ade80; }
  .ct-td.status-discard { color: rgba(255,255,255,0.3); }
  .ct-td.status-crash { color: #f87171; }

  .ct-bar-track {
    flex: 1;
    height: 4px;
    background: rgba(255,255,255,0.05);
    border-radius: 2px;
    overflow: hidden;
    max-width: 120px;
  }
  .ct-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 800ms ease;
  }
  .ct-bar-fill.keep { background: #4ade80; box-shadow: 0 0 6px rgba(74, 222, 128, 0.3); }
  .ct-bar-fill.discard { background: rgba(255,255,255,0.15); }
  .ct-bar-fill.crash { background: #f87171; }
  .ct-bar-pct {
    font-size: 0.55rem;
    color: rgba(255,255,255,0.25);
    min-width: 28px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* Result block (key-value pairs) */
  .ct-result-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ct-result-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 2px 0;
  }
  .ct-result-row.highlight {
    padding: 4px 8px;
    margin: 2px -8px;
    background: rgba(217, 119, 87, 0.06);
    border-radius: 4px;
    border-left: 2px solid #D97757;
  }
  .ct-result-key {
    font-size: 0.6rem;
    color: rgba(255,255,255,0.3);
    min-width: 90px;
    flex-shrink: 0;
  }
  .ct-result-val {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.7);
    word-break: break-all;
  }
  .ct-result-val.accent {
    color: #D97757;
    font-weight: 800;
    font-size: 0.78rem;
  }

  /* ═══════════════════════════════
     CHART
     ═══════════════════════════════ */
  .complete-chart {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 10px;
    overflow: hidden;
    animation: complete-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  }
  .cc-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .cc-title {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary, #6b6560);
    margin: 0;
  }
  .cc-legend {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cc-leg {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.5rem;
    color: var(--text-muted, #9a9590);
  }
  .cc-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .cc-dot.green { background: #27864a; }
  .cc-dot.gray { background: rgba(154,149,144,0.5); }
  .cc-line {
    width: 14px;
    height: 2.5px;
    border-radius: 1px;
    background: #27864a;
    box-shadow: 0 0 4px rgba(39,134,74,0.3);
  }
  .cc-chart-wrap {
    padding: 12px 16px 8px;
    display: flex;
    justify-content: center;
  }
  .cc-chart-wrap :global(svg) {
    width: 100%;
    height: auto;
  }

  /* ═══════════════════════════════
     STAT PILLS
     ═══════════════════════════════ */
  .complete-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    animation: complete-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }
  .cp-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    background: rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.04);
    padding: 6px 14px;
    border-radius: 100px;
  }
  .cp-pill-val {
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--text-primary, #2D2D2D);
    font-variant-numeric: tabular-nums;
  }
  .cp-pill-val.green { color: #27864a; }
  .cp-pill-val.accent { color: var(--accent, #D97757); }
  .cp-pill-label {
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted, #9a9590);
    font-weight: 600;
  }

  /* ═══════════════════════════════
     ACTIONS
     ═══════════════════════════════ */
  .complete-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
    animation: complete-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
  }
  .ca-btn {
    appearance: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 8px;
    transition: all 150ms ease;
    white-space: nowrap;
  }
  .ca-btn.primary {
    background: var(--accent, #D97757);
    color: #fff;
    padding: 11px 28px;
    box-shadow: 0 2px 8px rgba(217, 119, 87, 0.3);
  }
  .ca-btn.primary:hover {
    background: var(--accent-hover, #C4644A);
    box-shadow: 0 4px 16px rgba(217, 119, 87, 0.4);
    transform: translateY(-1px);
  }
  .ca-btn.secondary {
    background: none;
    border: 1px solid var(--border, #E5E0DA);
    color: var(--text-secondary, #6b6560);
    padding: 10px 24px;
  }
  .ca-btn.secondary:hover {
    border-color: var(--accent, #D97757);
    color: var(--accent, #D97757);
  }

  /* ═══════════════════════════════
     RESPONSIVE
     ═══════════════════════════════ */
  @media (max-width: 600px) {
    .complete-state {
      padding: 16px 12px 40px;
    }
    .ct-body { padding: 12px 14px; }
    .ct-header { gap: 10px; }
    .ct-owl { flex-shrink: 0; }
    .ct-result-key { min-width: 72px; }
    .ct-result-val.accent { font-size: 0.72rem; }
    .cc-head { flex-direction: column; gap: 6px; align-items: flex-start; }
    .complete-pills { gap: 6px; }
    .cp-pill { padding: 5px 10px; }
    .cp-pill-val { font-size: 0.68rem; }
    .complete-actions { flex-direction: column; align-items: stretch; }
    .ca-btn { justify-content: center; }
  }
</style>
