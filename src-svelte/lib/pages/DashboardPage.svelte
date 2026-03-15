<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import MeshCanvas from "../components/MeshCanvas.svelte";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { agentStore } from "../stores/agentStore.ts";
  import { wallet } from "../stores/walletStore.ts";
  import { router } from "../stores/router.ts";
  import PixelIcon from "../components/PixelIcon.svelte";

  onMount(() => {
    dashboardStore.init();
    agentStore.greet();
    return () => dashboardStore.destroy();
  });

  $: ds = $dashboardStore;

  // Running jobs
  $: heroJob = ds.liveJobs.find(j => j.status === 'running');
  $: heroProgress = heroJob
    ? Math.round(((heroJob.metrics?.epoch ?? 0) / Math.max(heroJob.metrics?.totalEpochs ?? 1, 1)) * 100)
    : 0;

  function nav(view: string) {
    router.navigate(view as any);
  }
</script>

<div class="studio-home" class:mounted={ds.mounted}>
  <div class="globe-layer">
    <MeshCanvas
      nodes={ds.renderNodes}
      jobs={ds.model.jobs}
      workers={ds.model.workers}
      viewerLocation={{ lat: 37.57, lng: 126.98 }}
    />
  </div>

  <div class="dash-content">
    <!-- Running Research Hero -->
    {#if heroJob}
      <button class="running-hero" on:click={() => nav('research')} in:fly={{ y: 10, duration: 220 }}>
        <div class="rh-left">
          <div class="rh-badge"><span class="rh-dot"></span>LIVE</div>
          <span class="rh-topic">{heroJob.topic}</span>
        </div>
        <div class="rh-right">
          <div class="rh-progress">
            <div class="rh-progress-bar" style="width: {heroProgress}%"></div>
          </div>
          <div class="rh-meta">
            <span>{heroProgress}%</span>
            <span>{heroJob.metrics?.bestMetric?.toFixed(4) ?? '—'} best</span>
            <span class="rh-goto">보기 →</span>
          </div>
        </div>
      </button>
    {/if}

    <!-- Status Strip -->
    <div class="status-strip">
      <button class="ss-item" on:click={() => nav('research')}>
        <PixelIcon type="research" size={16} />
        <span class="ss-val">{ds.researchSummary.runningJobs}</span>
        <span class="ss-label">Jobs</span>
      </button>
      <div class="ss-div"></div>
      <button class="ss-item" on:click={() => nav('models')}>
        <PixelIcon type="grid" size={16} />
        <span class="ss-val">{ds.modelsSummary.count}</span>
        <span class="ss-label">Models</span>
      </button>
      <div class="ss-div"></div>
      <button class="ss-item" on:click={() => nav('network')}>
        <PixelIcon type="globe" size={16} />
        <span class="ss-val">{ds.networkSummary.nodes}</span>
        <span class="ss-label">Nodes</span>
      </button>
      <div class="ss-div"></div>
      <button class="ss-item" on:click={() => nav('protocol')}>
        <PixelIcon type="protocol" size={16} />
        <span class="ss-val">{ds.protocolSummary.tvl}</span>
        <span class="ss-label">TVL</span>
      </button>
      {#if $wallet.connected}
        <div class="ss-div"></div>
        <button class="ss-item" on:click={() => nav('protocol')}>
          <PixelIcon type="portfolio" size={16} />
          <span class="ss-val">{ds.portfolioSummary.bondCount}</span>
          <span class="ss-label">Bonds</span>
        </button>
      {/if}
    </div>

    <!-- Activity Feed -->
    {#if ds.events.length > 0}
      <div class="activity-section">
        <h3 class="section-label">최근 활동</h3>
        <div class="activity-list">
          {#each ds.events.slice(0, 5) as event}
            <div class="activity-row">
              <span class="activity-dot" class:activity-dot--research={event.type === 'research'}
                class:activity-dot--model={event.type === 'model'}
                class:activity-dot--network={event.type === 'network'}></span>
              <span class="activity-text">{event.message}</span>
              <span class="activity-time">{new Date(event.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .studio-home {
    opacity: 0;
    transition: opacity var(--dur-slow, 600ms) ease;
    -webkit-font-smoothing: antialiased;
    background: var(--page-bg, #FAF9F7);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }
  .studio-home.mounted { opacity: 1; }

  .globe-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    filter: saturate(0.3) sepia(0.02) opacity(0.06);
    pointer-events: none;
  }

  .dash-content {
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 640px;
    width: 100%;
    margin: 0 auto;
    padding: 20px 20px 100px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ═══════ RUNNING HERO ═══════ */
  .running-hero {
    appearance: none;
    border: 1px solid rgba(217, 119, 87, 0.25);
    background: linear-gradient(135deg, rgba(217, 119, 87, 0.06) 0%, rgba(217, 119, 87, 0.02) 100%);
    border-radius: 14px;
    padding: 14px 18px;
    cursor: pointer;
    transition: all 180ms ease;
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    text-align: left;
  }
  .running-hero:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 2px 16px rgba(217, 119, 87, 0.12);
  }

  .rh-left { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .rh-badge {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--accent, #D97757);
    background: rgba(217, 119, 87, 0.1);
    padding: 3px 8px; border-radius: 6px;
  }
  .rh-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent, #D97757);
    animation: pulse 1.5s ease infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .rh-topic { font-size: 0.84rem; font-weight: 600; color: var(--text-primary, #2D2D2D); white-space: nowrap; }
  .rh-right { flex: 1; min-width: 0; }
  .rh-progress { width: 100%; height: 3px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden; }
  .rh-progress-bar { height: 100%; background: var(--accent, #D97757); border-radius: 2px; transition: width 400ms ease; }
  .rh-meta {
    display: flex; gap: 12px; margin-top: 5px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem; color: var(--text-muted, #9a9590);
  }
  .rh-goto { margin-left: auto; color: var(--accent, #D97757); font-weight: 600; }

  /* ═══════ STATUS STRIP ═══════ */
  .status-strip {
    display: flex;
    align-items: center;
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px;
    padding: 6px 4px;
  }
  .ss-item {
    appearance: none; border: none; background: transparent;
    flex: 1;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 6px 4px;
    border-radius: 8px;
    cursor: pointer; transition: all 120ms ease;
    color: var(--text-muted, #9a9590);
  }
  .ss-item:hover { background: rgba(0,0,0,0.03); color: var(--text-primary, #2D2D2D); }
  .ss-val {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.82rem; font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    font-variant-numeric: tabular-nums;
  }
  .ss-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.48rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--text-muted, #9a9590);
  }
  .ss-div { width: 1px; height: 20px; background: var(--border-subtle, #EDEAE5); flex-shrink: 0; }

  /* ═══════ ACTIVITY ═══════ */
  .activity-section { display: flex; flex-direction: column; gap: 8px; }
  .section-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem; font-weight: 700;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase; letter-spacing: 0.06em;
    margin: 0; padding-left: 2px;
  }
  .activity-list {
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 10px; overflow: hidden;
  }
  .activity-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .activity-row:last-child { border-bottom: none; }
  .activity-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--text-muted, #9a9590); flex-shrink: 0;
  }
  .activity-dot--research { background: var(--accent, #D97757); }
  .activity-dot--model { background: #2980b9; }
  .activity-dot--network { background: var(--green, #27864a); }
  .activity-text {
    flex: 1; font-size: 0.72rem;
    color: var(--text-primary, #2D2D2D);
    min-width: 0; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .activity-time {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; color: var(--text-muted, #9a9590);
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    .dash-content { padding: 12px 12px 88px; gap: 10px; }
    .running-hero { padding: 10px 14px; flex-direction: column; align-items: stretch; gap: 8px; }
    .status-strip { overflow-x: auto; }
    .ss-label { display: none; }
  }
</style>
