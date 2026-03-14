<script lang="ts">
  import { onMount } from "svelte";
  import { router } from "./router.ts";
  import {
    jobStore,
    completedCount,
    keepCount,
    discardCount,
    crashCount,
    metricHistory,
    statusMessage,
    latestFinding,
    humanizeModification,
  } from "./jobStore.ts";
  import ModelSummaryCard from "./ModelSummaryCard.svelte";
  import MetricChart from "./MetricChart.svelte";
  import PixelOwl from "./PixelOwl.svelte";

  // Quick-start topic input
  let quickTopic = "";

  // Job state
  $: job = $jobStore;
  $: phase = job.phase;
  $: experiments = job.experiments;
  $: bestMetric = job.bestMetric;
  $: totalTarget = job.totalExperiments;
  $: completed = $completedCount;
  $: keeps = $keepCount;
  $: discards = $discardCount;
  $: crashes = $crashCount;
  $: history = $metricHistory;
  $: status = $statusMessage;
  $: finding = $latestFinding;

  // Chart best index
  $: chartBestIdx = (() => {
    if (!history.length) return -1;
    let minVal = Infinity;
    let minIdx = -1;
    history.forEach((d, i) => { if (d.y < minVal) { minVal = d.y; minIdx = i; } });
    return minIdx;
  })();

  // Running-state computed
  $: trainingCount = experiments.filter(e => e.status === 'training').length;
  $: activeNodes = new Set(experiments.map(e => e.nodeId)).size;
  $: hitRate = completed > 0 ? Math.round((keeps / completed) * 100) : 0;
  $: progress = totalTarget > 0 ? Math.round((completed / totalTarget) * 100) : 0;
  $: trainingExp = experiments.find(e => e.status === 'training') ?? null;

  // Recent experiment log (last 10, newest first)
  $: recentLog = experiments
    .filter(e => e.status !== 'training')
    .slice(0, 10);

  // Owl mood — reacts to research phase
  let owlMood: 'idle' | 'research' | 'build' | 'celebrate' | 'sleep' = 'sleep';
  let celebrateTimer: ReturnType<typeof setTimeout> | null = null;
  let prevKeepCount = 0;

  $: {
    if (phase === 'idle') owlMood = 'sleep';
    else if (phase === 'setup') owlMood = 'research';
    else if (phase === 'running') {
      // Check if new keep happened
      if ($keepCount > prevKeepCount && prevKeepCount > 0) {
        owlMood = 'celebrate';
        if (celebrateTimer) clearTimeout(celebrateTimer);
        celebrateTimer = setTimeout(() => { owlMood = 'research'; }, 3000);
      } else if (owlMood !== 'celebrate') {
        owlMood = 'research';
      }
      prevKeepCount = $keepCount;
    }
    else if (phase === 'complete') owlMood = 'celebrate';
  }

  // AI Agent reasoning thoughts
  const AI_THOUGHTS = [
    'Analyzing loss convergence patterns across branches...',
    'Evaluating hyperparameter sensitivity for learning rate...',
    'Cross-referencing architecture variations with metric deltas...',
    'Pruning underperforming configuration subspace...',
    'Generating next-round experiment candidates...',
    'Comparing gradient flow statistics across layers...',
    'Optimizing batch scheduling for GPU utilization...',
    'Correlating dropout rates with validation improvements...',
    'Adjusting search distribution based on promising regions...',
    'Running statistical significance tests on top results...',
  ];
  let aiThoughtIdx = 0;
  let aiThought = AI_THOUGHTS[0];

  // Event log formatting
  function formatLogTime(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  $: eventLog = (() => {
    const evts: {time: string; type: string; message: string}[] = [];
    if (job.startedAt) {
      evts.push({ time: formatLogTime(job.startedAt), type: 'SYSTEM', message: 'autoresearch init' });
      evts.push({ time: formatLogTime(job.startedAt), type: 'SUBMIT', message: `topic="${job.topic}"` });
    }
    for (const exp of experiments) {
      if (exp.status !== 'training') {
        evts.push({
          time: formatLogTime(exp.timestamp),
          type: exp.status === 'keep' ? 'KEEP' : exp.status === 'crash' ? 'CRASH' : 'DISCARD',
          message: `#${exp.id} ${exp.modification} → ${exp.status}${exp.metric > 0 ? ` (${exp.metric.toFixed(3)})` : ''}`
        });
      }
    }
    return evts;
  })();

  // Elapsed time
  function fmtTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // ETA
  $: etaDisplay = (() => {
    if (completed === 0 || job.elapsedSeconds === 0) return '--';
    const rate = completed / job.elapsedSeconds;
    const remaining = totalTarget - completed;
    const etaSecs = Math.round(remaining / rate);
    const m = Math.floor(etaSecs / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  })();

  function handleQuickStart() {
    if (!quickTopic.trim()) return;
    jobStore.startJob(quickTopic.trim());
  }

  function handleNewResearch() {
    jobStore.reset();
    quickTopic = '';
  }

  // Terminal auto-scroll
  let terminalEl: HTMLDivElement;
  $: if (terminalEl && eventLog.length) {
    requestAnimationFrame(() => {
      if (terminalEl) terminalEl.scrollTop = terminalEl.scrollHeight;
    });
  }

  onMount(() => {
    // AI thought rotation
    const aiThoughtInterval = setInterval(() => {
      aiThoughtIdx = (aiThoughtIdx + 1) % AI_THOUGHTS.length;
      aiThought = AI_THOUGHTS[aiThoughtIdx];
    }, 3200);

    // Start job from route params
    const unsub = router.params.subscribe(p => {
      if (p.topic && job.phase === 'idle') {
        jobStore.startJob(p.topic);
      }
    });

    return () => {
      clearInterval(aiThoughtInterval);
      if (celebrateTimer) clearTimeout(celebrateTimer);
      unsub();
    };
  });
</script>

<div class="autoresearch">

  <!-- ══ IDLE ══ -->
  {#if phase === 'idle'}
    <div class="idle-state">
      <div class="idle-owl">
        <PixelOwl size={1.2} mood="sleep" />
      </div>
      <span class="idle-eyebrow">AUTORESEARCH</span>
      <h2 class="idle-title">Your Autonomous Research Lab</h2>
      <p class="idle-desc">Write a research program below. AI agents will design experiments, train models, and surface the best results.</p>

      <div class="ie-editor-wrap">
        <div class="ie-owl-track">
          <div class="ie-walking-owl">
            <PixelOwl size={0.22} mood="idle" />
          </div>
        </div>
        <div class="idle-editor">
        <div class="ie-chrome">
          <div class="ie-dots">
            <span class="ie-dot red"></span>
            <span class="ie-dot yellow"></span>
            <span class="ie-dot green"></span>
          </div>
          <span class="ie-filename">program.md</span>
        </div>
        <div class="ie-body">
          <div class="ie-line-numbers">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
          </div>
          <textarea
            class="ie-textarea"
            rows="6"
            placeholder={"# Research Goal\nPredict Ethereum price movements using on-chain data\n\n# Approach\nTrain a time-series model on DEX volume, gas fees,\nand whale wallet activity from the last 90 days"}
            bind:value={quickTopic}
            on:keydown={(e) => { if (e.key === 'Enter' && e.metaKey) handleQuickStart(); }}
          ></textarea>
        </div>
        <div class="ie-footer">
          <div class="ie-tags">
            <span class="ie-tag">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" class="px-icon" shape-rendering="crispEdges">
                <rect x="3" y="1" width="2" height="2" fill="currentColor"/>
                <rect x="5" y="3" width="2" height="2" fill="currentColor"/>
                <rect x="7" y="5" width="2" height="2" fill="currentColor" opacity="0.7"/>
                <rect x="1" y="7" width="2" height="2" fill="currentColor" opacity="0.5"/>
                <rect x="3" y="9" width="2" height="2" fill="currentColor" opacity="0.5"/>
                <rect x="9" y="1" width="2" height="2" fill="currentColor" opacity="0.4"/>
              </svg>
              60+ train.py mutations
            </span>
            <span class="ie-tag">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" class="px-icon" shape-rendering="crispEdges">
                <rect x="1" y="5" width="2" height="2" fill="currentColor" opacity="0.5"/>
                <rect x="3" y="3" width="2" height="2" fill="currentColor"/>
                <rect x="5" y="7" width="2" height="2" fill="currentColor"/>
                <rect x="7" y="1" width="2" height="2" fill="currentColor"/>
                <rect x="9" y="5" width="2" height="2" fill="currentColor" opacity="0.5"/>
              </svg>
              val_bpb hill-climbing
            </span>
            <span class="ie-tag accent">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" class="px-icon" shape-rendering="crispEdges">
                <rect x="4" y="1" width="4" height="2" fill="currentColor"/>
                <rect x="2" y="3" width="2" height="2" fill="currentColor"/>
                <rect x="8" y="3" width="2" height="2" fill="currentColor"/>
                <rect x="2" y="5" width="2" height="4" fill="currentColor"/>
                <rect x="8" y="5" width="2" height="4" fill="currentColor"/>
                <rect x="4" y="9" width="4" height="2" fill="currentColor"/>
                <rect x="5" y="3" width="2" height="2" fill="currentColor" opacity="0.5"/>
              </svg>
              ~5 min
            </span>
          </div>
          <button class="ie-submit" on:click={handleQuickStart} disabled={!quickTopic.trim()}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" class="px-icon" shape-rendering="crispEdges">
              <rect x="6" y="0" width="2" height="2" fill="currentColor"/>
              <rect x="5" y="2" width="2" height="2" fill="currentColor"/>
              <rect x="3" y="4" width="4" height="2" fill="currentColor"/>
              <rect x="5" y="6" width="2" height="2" fill="currentColor"/>
              <rect x="4" y="8" width="2" height="2" fill="currentColor"/>
              <rect x="3" y="10" width="2" height="2" fill="currentColor"/>
            </svg>
            Launch Autoresearch
          </button>
        </div>
      </div>
      </div>

      <div class="idle-steps">
        <div class="idle-step"><span class="step-num">1</span><span class="step-text">Write a research program</span></div>
        <div class="idle-step-arrow">&rarr;</div>
        <div class="idle-step"><span class="step-num">2</span><span class="step-text">AI runs 100+ experiments</span></div>
        <div class="idle-step-arrow">&rarr;</div>
        <div class="idle-step"><span class="step-num">3</span><span class="step-text">You get a trained model</span></div>
      </div>
      <button class="idle-back" on:click={() => router.navigate('dashboard')}>&larr; Back to Dashboard</button>
    </div>

  <!-- ══ SETUP ══ -->
  {:else if phase === 'setup'}
    <div class="setup-state">
      <div class="setup-owl">
        <PixelOwl size={1} mood="research" />
      </div>
      <div class="setup-terminal">
        <div class="term-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span class="term-title">hoot — setup</span></div>
        <div class="term-body">
          <div class="term-line"><span class="term-prompt">❯</span> hoot init --topic "{job.topic}"</div>
          <div class="term-line dim"><span class="term-cursor"></span>{status}</div>
        </div>
      </div>
    </div>

  <!-- ══ RUNNING ══ -->
  {:else if phase === 'running'}
    <div class="running">
      <!-- Header: Owl + Topic + Stats -->
      <div class="run-header">
        <div class="run-header-left">
          <div class="run-owl">
            <PixelOwl size={0.7} mood={owlMood} />
          </div>
          <div class="run-info">
            <div class="run-topic-row">
              <span class="run-status-dot"></span>
              <span class="run-topic">{job.topic}</span>
            </div>
            <div class="run-thought">{aiThought}</div>
          </div>
        </div>
        <div class="run-header-right">
          <div class="run-stat"><span class="run-stat-val">{completed}<span class="run-stat-dim">/{totalTarget}</span></span><span class="run-stat-label">experiments</span></div>
          <div class="run-stat"><span class="run-stat-val green">{keeps}</span><span class="run-stat-label">kept</span></div>
          <div class="run-stat"><span class="run-stat-val">{bestMetric === Infinity ? '--' : bestMetric.toFixed(3)}</span><span class="run-stat-label">best bpb</span></div>
          <div class="run-stat"><span class="run-stat-val">{fmtTime(job.elapsedSeconds)}</span><span class="run-stat-label">elapsed</span></div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="run-progress">
        <div class="run-progress-bar">
          <div class="run-progress-fill" style="width: {progress}%"></div>
        </div>
        <div class="run-progress-meta">
          <span>{progress}% complete</span>
          <span>ETA: {etaDisplay}</span>
          <span>Hit rate: {hitRate}%</span>
        </div>
      </div>

      <!-- Terminal (Dark) -->
      <div class="run-terminal">
        <div class="term-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span class="term-title">hoot — research log</span></div>
        <div class="term-body term-scroll" bind:this={terminalEl}>
          {#each eventLog as evt}
            <div class="term-log-line" class:keep={evt.type === 'KEEP'} class:crash={evt.type === 'CRASH'}>
              <span class="tl-time">{evt.time}</span>
              <span class="tl-type" class:type-keep={evt.type === 'KEEP'} class:type-crash={evt.type === 'CRASH'} class:type-discard={evt.type === 'DISCARD'} class:type-system={evt.type === 'SYSTEM' || evt.type === 'SUBMIT'}>{evt.type}</span>
              <span class="tl-msg">{evt.message}</span>
            </div>
          {/each}
          {#if trainingExp}
            <div class="term-log-line training">
              <span class="tl-time">now</span>
              <span class="tl-type type-training">TRAIN</span>
              <span class="tl-msg">#{trainingExp.id} {trainingExp.modification} <span class="tl-blink">█</span></span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Grid: Chart + Experiments -->
      <div class="run-grid">
        <!-- Hill-climbing chart -->
        <div class="run-chart-panel">
          <div class="panel-head">
            <h3 class="panel-title">val_bpb Descent</h3>
            <div class="panel-head-right">
              <span class="panel-legend"><span class="legend-dot green"></span>keep</span>
              <span class="panel-legend"><span class="legend-dot gray"></span>discard</span>
              <span class="panel-legend"><span class="legend-line"></span>frontier</span>
              <span class="panel-badge">{history.length} runs</span>
            </div>
          </div>
          <div class="chart-wrap">
            <MetricChart data={history} bestIndex={chartBestIdx} width={420} height={160} />
          </div>
        </div>

        <!-- Recent experiments -->
        <div class="run-experiments-panel">
          <div class="panel-head">
            <h3 class="panel-title">Recent Experiments</h3>
            <span class="panel-badge">{completed} total</span>
          </div>
          <div class="exp-list">
            {#each recentLog as exp}
              <div class="exp-row" class:exp-keep={exp.status === 'keep'} class:exp-crash={exp.status === 'crash'}>
                <span class="exp-id">#{exp.id}</span>
                <span class="exp-status" class:s-keep={exp.status === 'keep'} class:s-crash={exp.status === 'crash'} class:s-discard={exp.status === 'discard'}>
                  {exp.status === 'keep' ? '✓ KEEP' : exp.status === 'crash' ? '✕ CRASH' : '— DISCARD'}
                </span>
                <span class="exp-metric">{exp.metric > 0 ? exp.metric.toFixed(3) : '--'}</span>
                <span class="exp-mod">{humanizeModification(exp.modification)}</span>
              </div>
            {:else}
              <div class="exp-empty">Awaiting first experiment results...</div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Bottom actions -->
      <div class="run-actions">
        <button class="btn-stop" on:click={handleNewResearch}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
          Stop Research
        </button>
      </div>
    </div>

  <!-- ══ COMPLETE ══ -->
  {:else if phase === 'complete'}
    <ModelSummaryCard
      onViewDetails={() => router.navigate('model-detail', { modelId: 'model-um69vho1' })}
      onNewResearch={handleNewResearch}
    />
  {/if}
</div>

<style>
  .autoresearch {
    max-width: 100%;
    margin: 0;
    padding: 0;
    min-height: calc(100vh - 52px);
    overflow-x: hidden;
  }

  /* ═══════════════════════════════
     IDLE STATE
     ═══════════════════════════════ */
  .idle-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    text-align: center;
    min-height: 60vh;
  }

  .idle-owl {
    margin-bottom: 16px;
    filter: drop-shadow(0 0 20px rgba(217, 119, 87, 0.1));
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .idle-eyebrow {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent, #D97757);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
  }
  .idle-eyebrow::before, .idle-eyebrow::after {
    content: '';
    width: 12px;
    height: 1px;
    background: var(--accent, #D97757);
    opacity: 0.3;
  }

  .idle-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0 0 8px;
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  }

  .idle-desc {
    font-size: 0.9rem;
    color: var(--text-secondary, #6b6560);
    max-width: 440px;
    margin: 0 0 24px;
    line-height: 1.5;
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.28s both;
  }

  /* ── Idle Editor (program.md style) ── */
  .ie-editor-wrap {
    position: relative;
    width: 100%;
    max-width: 580px;
    margin-bottom: 20px;
  }

  .idle-editor {
    width: 100%;
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 10px;
    background: var(--surface, #fff);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    overflow: hidden;
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.36s both;
    transition: border-color 300ms, box-shadow 300ms;
  }
  .idle-editor:focus-within {
    border-color: var(--accent, #D97757);
    box-shadow: 0 0 0 3px rgba(217,119,87,0.08), 0 8px 32px rgba(0,0,0,0.12);
  }

  .ie-chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: rgba(0,0,0,0.02);
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .ie-dots { display: flex; gap: 5px; }
  .ie-dot { width: 8px; height: 8px; border-radius: 50%; }
  .ie-dot.red { background: #ff5f56; }
  .ie-dot.yellow { background: #ffbd2e; }
  .ie-dot.green { background: #27c93f; }
  .ie-filename {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--text-secondary, #6b6560);
    margin-left: 4px;
  }
  /* ── Walking Owl on top of editor ── */
  .ie-owl-track {
    position: absolute;
    top: -22px;
    left: 0;
    right: 0;
    height: 24px;
    z-index: 3;
    pointer-events: none;
  }
  .ie-walking-owl {
    position: absolute;
    bottom: 0;
    left: 20px;
    animation: ieOwlPatrol 10s linear infinite, ieOwlStep 0.35s ease-in-out infinite;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.12));
  }
  @keyframes ieOwlPatrol {
    0%   { left: 20px;  transform: scaleX(1); }
    48%  { left: calc(100% - 44px); transform: scaleX(1); }
    50%  { left: calc(100% - 44px); transform: scaleX(-1); }
    98%  { left: 20px;  transform: scaleX(-1); }
    100% { left: 20px;  transform: scaleX(1); }
  }
  @keyframes ieOwlStep {
    0%, 100% { margin-bottom: 0; }
    50%      { margin-bottom: 2px; }
  }

  .ie-body {
    display: flex;
    min-height: 120px;
  }
  .ie-line-numbers {
    display: flex;
    flex-direction: column;
    padding: 12px 0 12px 14px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    line-height: 1.7;
    color: var(--border, #E5E0DA);
    user-select: none;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
  .ie-textarea {
    flex: 1;
    border: none;
    outline: none;
    background: none;
    resize: none;
    padding: 12px 14px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.75rem;
    line-height: 1.7;
    color: var(--text-primary, #2D2D2D);
    min-width: 0;
  }
  .ie-textarea::placeholder {
    color: var(--text-muted, #9a9590);
    opacity: 0.7;
  }

  .ie-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-top: 1px solid var(--border-subtle, #EDEAE5);
    background: rgba(0,0,0,0.015);
    gap: 10px;
  }
  .ie-tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }
  .ie-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem;
    font-weight: 600;
    color: var(--text-secondary, #6b6560);
    background: rgba(0, 0, 0, 0.03);
    padding: 3px 9px;
    border-radius: 100px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    white-space: nowrap;
  }
  .ie-tag svg { color: var(--text-muted, #9a9590); flex-shrink: 0; }
  .ie-tag.accent {
    background: rgba(217, 119, 87, 0.06);
    border-color: rgba(217, 119, 87, 0.12);
    color: var(--accent, #D97757);
  }
  .ie-tag.accent svg { color: var(--accent, #D97757); }

  .ie-submit {
    appearance: none;
    border: none;
    background: var(--accent, #D97757);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 150ms, transform 100ms;
  }
  .ie-submit:hover:not(:disabled) { background: var(--accent-hover, #C4644A); }
  .ie-submit:active:not(:disabled) { transform: scale(0.97); }
  .ie-submit:disabled { opacity: 0.4; cursor: not-allowed; }

  .idle-back {
    appearance: none;
    border: none;
    background: none;
    font-size: 0.78rem;
    color: var(--text-muted, #9a9590);
    cursor: pointer;
    transition: color 200ms, transform 200ms;
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.52s both;
  }
  .idle-back:hover { color: var(--accent, #D97757); transform: translateX(-3px); }

  .idle-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: 24px;
    padding: 16px 24px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 10px;
    animation: idle-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.44s both;
  }
  .idle-step {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: center;
  }
  .step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(217, 119, 87, 0.08);
    color: var(--accent, #D97757);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .step-text {
    font-size: 0.78rem;
    color: var(--text-secondary, #6b6560);
    white-space: nowrap;
  }
  .idle-step-arrow {
    color: var(--text-muted, #9a9590);
    font-size: 0.82rem;
    flex-shrink: 0;
    padding: 0 6px;
  }

  @keyframes idle-enter {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ═══════════════════════════════
     SETUP STATE
     ═══════════════════════════════ */
  .setup-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    min-height: 60vh;
    gap: 24px;
    animation: setup-enter 0.5s ease-out;
  }
  .setup-owl {
    filter: drop-shadow(0 0 20px rgba(217, 119, 87, 0.12));
  }
  @keyframes setup-enter {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ═══════════════════════════════
     TERMINAL SHARED STYLES
     ═══════════════════════════════ */
  .setup-terminal, .run-terminal {
    background: #0D0D14;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .setup-terminal { width: 100%; max-width: 520px; }

  .term-dots {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .dot.red { background: #FF5F57; }
  .dot.yellow { background: #FEBC2E; }
  .dot.green { background: #28C840; }
  .term-title {
    margin-left: 8px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.04em;
  }

  .term-body {
    padding: 14px 16px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    line-height: 1.7;
  }

  .term-line {
    color: rgba(255,255,255,0.7);
  }
  .term-line.dim { color: rgba(255,255,255,0.35); }
  .term-prompt {
    color: #D97757;
    margin-right: 8px;
    font-weight: 700;
  }
  .term-cursor {
    display: inline-block;
    width: 6px;
    height: 12px;
    background: #D97757;
    margin-right: 6px;
    animation: blink 1s step-end infinite;
    vertical-align: middle;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* ═══════════════════════════════
     RUNNING STATE
     ═══════════════════════════════ */
  .running {
    max-width: 960px;
    margin: 0 auto;
    padding: 20px 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: setup-enter 0.4s ease-out;
  }

  /* Header */
  .run-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 12px;
  }
  .run-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
  }
  .run-owl {
    flex-shrink: 0;
    filter: drop-shadow(0 0 12px rgba(217, 119, 87, 0.1));
  }
  .run-info {
    flex: 1;
    min-width: 0;
  }
  .run-topic-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .run-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #27864a;
    box-shadow: 0 0 8px rgba(39,134,74,0.5);
    animation: dot-pulse 2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes dot-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .run-topic {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .run-thought {
    font-size: 0.68rem;
    color: var(--text-muted, #9a9590);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .run-header-right {
    display: flex;
    gap: 20px;
    flex-shrink: 0;
  }
  .run-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .run-stat-val {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    font-variant-numeric: tabular-nums;
  }
  .run-stat-val.green { color: #27864a; }
  .run-stat-dim {
    font-weight: 400;
    color: var(--text-muted, #9a9590);
    font-size: 0.72rem;
  }
  .run-stat-label {
    font-size: 0.56rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted, #9a9590);
    font-weight: 600;
  }

  /* Progress */
  .run-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .run-progress-bar {
    height: 4px;
    background: rgba(217, 119, 87, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  .run-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #D97757, #E8956E);
    border-radius: 4px;
    transition: width 500ms ease;
    box-shadow: 0 0 8px rgba(217, 119, 87, 0.3);
  }
  .run-progress-meta {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem;
    color: var(--text-muted, #9a9590);
    letter-spacing: 0.02em;
  }

  /* Terminal (running) */
  .run-terminal {
    max-height: 200px;
    display: flex;
    flex-direction: column;
  }
  .term-scroll {
    flex: 1;
    overflow-y: auto;
    max-height: 148px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }
  .term-scroll::-webkit-scrollbar { width: 4px; }
  .term-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  .term-log-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 2px 0;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.65rem;
    color: rgba(255,255,255,0.5);
    line-height: 1.6;
  }
  .term-log-line.keep { color: rgba(39,134,74,0.9); }
  .term-log-line.crash { color: rgba(192,57,43,0.7); }
  .term-log-line.training { color: rgba(183,134,14,0.9); }

  .tl-time { color: rgba(255,255,255,0.2); flex-shrink: 0; min-width: 52px; }
  .tl-type {
    flex-shrink: 0;
    min-width: 52px;
    font-weight: 700;
    font-size: 0.58rem;
    letter-spacing: 0.04em;
  }
  .tl-type.type-keep { color: #4ade80; }
  .tl-type.type-crash { color: #f87171; }
  .tl-type.type-discard { color: rgba(255,255,255,0.3); }
  .tl-type.type-system { color: #D97757; }
  .tl-type.type-training { color: #fbbf24; }
  .tl-msg { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tl-blink { animation: blink 0.8s step-end infinite; color: #fbbf24; }

  /* Grid */
  .run-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 16px;
  }

  .run-chart-panel, .run-experiments-panel {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 10px;
    overflow: hidden;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .panel-title {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary, #6b6560);
    margin: 0;
  }
  .panel-head-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .panel-legend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.5rem;
    color: var(--text-muted, #9a9590);
    letter-spacing: 0.03em;
  }
  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-dot.green { background: #27864a; }
  .legend-dot.gray { background: rgba(154,149,144,0.5); }
  .legend-line {
    width: 14px;
    height: 2.5px;
    border-radius: 1px;
    background: #27864a;
    flex-shrink: 0;
    box-shadow: 0 0 4px rgba(39,134,74,0.3);
  }
  .panel-badge {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem;
    color: var(--text-muted, #9a9590);
    background: rgba(217, 119, 87, 0.06);
    padding: 2px 8px;
    border-radius: 100px;
  }

  .chart-wrap {
    padding: 12px 16px 8px;
    display: flex;
    justify-content: center;
  }
  .chart-wrap :global(svg) {
    width: 100%;
    height: auto;
  }

  /* Experiments list */
  .exp-list {
    max-height: 220px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.08) transparent;
  }
  .exp-list::-webkit-scrollbar { width: 3px; }
  .exp-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }

  .exp-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    font-size: 0.72rem;
    transition: background 150ms ease;
  }
  .exp-row:last-child { border-bottom: none; }
  .exp-row:hover { background: rgba(0,0,0,0.015); }
  .exp-row.exp-keep { background: rgba(39,134,74,0.03); }
  .exp-row.exp-crash { background: rgba(192,57,43,0.03); }

  .exp-id {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    color: var(--text-muted, #9a9590);
    min-width: 28px;
    flex-shrink: 0;
  }
  .exp-status {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    min-width: 64px;
    flex-shrink: 0;
  }
  .exp-status.s-keep { color: #27864a; }
  .exp-status.s-crash { color: #c0392b; }
  .exp-status.s-discard { color: var(--text-muted, #9a9590); }
  .exp-metric {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-primary, #2D2D2D);
    min-width: 44px;
    flex-shrink: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .exp-mod {
    flex: 1;
    font-size: 0.65rem;
    color: var(--text-secondary, #6b6560);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .exp-empty {
    padding: 32px 16px;
    text-align: center;
    color: var(--text-muted, #9a9590);
    font-size: 0.75rem;
    font-style: italic;
  }

  /* Bottom actions */
  .run-actions {
    display: flex;
    justify-content: center;
    padding-top: 8px;
  }
  .btn-stop {
    appearance: none;
    border: 1px solid rgba(192, 57, 43, 0.2);
    background: rgba(192, 57, 43, 0.04);
    color: #c0392b;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 150ms ease;
  }
  .btn-stop:hover {
    background: rgba(192, 57, 43, 0.08);
    border-color: rgba(192, 57, 43, 0.4);
  }

  /* ═══════════════════════════════
     RESPONSIVE
     ═══════════════════════════════ */
  @media (max-width: 768px) {
    .running { padding: 12px 12px 32px; }
    .run-header { flex-direction: column; align-items: stretch; }
    .run-header-right { justify-content: space-around; }
    .run-grid { grid-template-columns: 1fr; }
    .idle-steps { flex-wrap: wrap; }
    .idle-step-arrow { display: none; }
  }

  @media (max-width: 480px) {
    .idle-state { padding: 32px 16px; }
    .idle-title { font-size: 1.3rem; }
    .ie-footer { flex-direction: column; gap: 8px; }
    .ie-submit { width: 100%; justify-content: center; }
    .ie-tags { justify-content: center; }
    .ie-line-numbers { display: none; }
    .ie-textarea { padding: 12px; }
    .ie-tag { font-size: 0.48rem; padding: 2px 7px; }
    .run-header-right { flex-wrap: wrap; gap: 12px; }
  }
</style>
