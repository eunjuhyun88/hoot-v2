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

  // Running jobs hero
  $: heroJob = ds.liveJobs.find(j => j.status === 'running');
  $: heroProgress = heroJob
    ? Math.round(((heroJob.metrics?.epoch ?? 0) / Math.max(heroJob.metrics?.totalEpochs ?? 1, 1)) * 100)
    : 0;

  function nav(view: string) {
    router.navigate(view as any);
  }
</script>

<div class="studio-home" class:mounted={ds.mounted}>
  <!-- Globe background -->
  <div class="globe-layer">
    <MeshCanvas
      nodes={ds.renderNodes}
      jobs={ds.model.jobs}
      workers={ds.model.workers}
      viewerLocation={{ lat: 37.57, lng: 126.98 }}
    />
  </div>

  <!-- Dashboard content -->
  <div class="dash-content">
    <!-- Hero: Running Research -->
    {#if heroJob}
      <button class="hero-card" on:click={() => nav('research')} in:fly={{ y: 12, duration: 250 }}>
        <div class="hero-top">
          <span class="hero-badge">RUNNING</span>
          <span class="hero-topic">{heroJob.topic}</span>
        </div>
        <div class="hero-progress">
          <div class="hero-progress-bar" style="width: {heroProgress}%"></div>
        </div>
        <div class="hero-stats">
          <span class="hero-stat">{heroProgress}% 완료</span>
          <span class="hero-stat">{heroJob.metrics?.bestMetric?.toFixed(4) ?? '—'} best</span>
          <span class="hero-stat hero-link">리서치 보기 →</span>
        </div>
      </button>
    {:else}
      <div class="hero-card hero-idle" in:fly={{ y: 12, duration: 250 }}>
        <span class="hero-owl">🦉</span>
        <div class="hero-idle-text">
          <p class="hero-title">HOOT Magnet Studio</p>
          <p class="hero-subtitle">에이전트 바에서 연구 주제를 입력하세요</p>
        </div>
      </div>
    {/if}

    <!-- Status Grid -->
    <div class="stat-grid">
      <button class="stat-card" on:click={() => nav('research')}>
        <div class="stat-icon"><PixelIcon type="research" size={20} /></div>
        <div class="stat-body">
          <span class="stat-value">{ds.researchSummary.runningJobs}</span>
          <span class="stat-label">Running Jobs</span>
        </div>
        <span class="stat-sub">{ds.researchSummary.totalFindings} findings</span>
      </button>

      <button class="stat-card" on:click={() => nav('models')}>
        <div class="stat-icon"><PixelIcon type="grid" size={20} /></div>
        <div class="stat-body">
          <span class="stat-value">{ds.modelsSummary.count}</span>
          <span class="stat-label">Models</span>
        </div>
        <span class="stat-sub">{ds.modelsSummary.rentedOut} rented</span>
      </button>

      <button class="stat-card" on:click={() => nav('network')}>
        <div class="stat-icon"><PixelIcon type="globe" size={20} /></div>
        <div class="stat-body">
          <span class="stat-value">{ds.networkSummary.nodes}</span>
          <span class="stat-label">Nodes</span>
        </div>
        <span class="stat-sub">{ds.networkSummary.gpuCount} GPUs</span>
      </button>

      <button class="stat-card" on:click={() => nav('protocol')}>
        <div class="stat-icon"><PixelIcon type="protocol" size={20} /></div>
        <div class="stat-body">
          <span class="stat-value">{ds.protocolSummary.tvl}</span>
          <span class="stat-label">TVL</span>
        </div>
        <span class="stat-sub">{ds.protocolSummary.bondCount} bonds</span>
      </button>
    </div>

    <!-- Recent Events -->
    {#if ds.events.length > 0}
      <div class="events-section">
        <h3 class="section-title">최근 활동</h3>
        <div class="events-list">
          {#each ds.events.slice(0, 6) as event}
            <div class="event-row">
              <span class="event-icon">
                {#if event.type === 'research'}🔬
                {:else if event.type === 'model'}🤖
                {:else if event.type === 'network'}🌐
                {:else if event.type === 'protocol'}📊
                {:else}📋{/if}
              </span>
              <span class="event-text">{event.message}</span>
              <span class="event-time">{new Date(event.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Portfolio (if logged in) -->
    {#if $wallet.connected}
      <div class="portfolio-section">
        <h3 class="section-title">내 포트폴리오</h3>
        <div class="portfolio-row">
          <div class="portfolio-stat">
            <span class="portfolio-value">{ds.portfolioSummary.bondCount}</span>
            <span class="portfolio-label">Bonds</span>
          </div>
          <div class="portfolio-stat">
            <span class="portfolio-value">{ds.portfolioSummary.totalStaked}</span>
            <span class="portfolio-label">Staked</span>
          </div>
          <div class="portfolio-stat">
            <span class="portfolio-value">{ds.portfolioSummary.earnings}</span>
            <span class="portfolio-label">Earnings</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* ═══════ CONTAINER ═══════ */
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

  /* ═══════ GLOBE BACKGROUND ═══════ */
  .globe-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    filter: saturate(0.3) sepia(0.02) opacity(0.08);
    pointer-events: none;
  }

  /* ═══════ DASHBOARD CONTENT ═══════ */
  .dash-content {
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 680px;
    width: 100%;
    margin: 0 auto;
    padding: 28px 20px 100px; /* bottom padding for AgentBar */
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ═══════ HERO CARD ═══════ */
  .hero-card {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 180ms ease;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    text-align: left;
    width: 100%;
  }
  .hero-card:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 4px 20px rgba(217, 119, 87, 0.12);
    transform: translateY(-1px);
  }

  .hero-idle {
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: default;
  }
  .hero-idle:hover {
    transform: none;
    border-color: var(--border, #E5E0DA);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  }

  .hero-owl { font-size: 2rem; }
  .hero-idle-text { display: flex; flex-direction: column; gap: 4px; }
  .hero-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0;
    font-family: var(--font-display, 'Playfair Display', serif);
  }
  .hero-subtitle {
    font-size: 0.82rem;
    color: var(--text-muted, #9a9590);
    margin: 0;
  }

  .hero-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .hero-badge {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #fff;
    background: var(--accent, #D97757);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .hero-topic {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-primary, #2D2D2D);
  }

  .hero-progress {
    width: 100%;
    height: 4px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 10px;
  }
  .hero-progress-bar {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    transition: width 400ms ease;
  }

  .hero-stats {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .hero-stat {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.7rem;
    color: var(--text-muted, #9a9590);
  }
  .hero-link {
    margin-left: auto;
    color: var(--accent, #D97757);
    font-weight: 600;
  }

  /* ═══════ STAT GRID ═══════ */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    transition: all 150ms ease;
    text-align: left;
  }
  .stat-card:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 2px 12px rgba(217, 119, 87, 0.08);
    transform: translateY(-1px);
  }
  .stat-card:active { transform: translateY(0) scale(0.98); }

  .stat-icon {
    color: var(--text-muted, #9a9590);
    display: flex;
  }

  .stat-body {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .stat-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    font-variant-numeric: tabular-nums;
  }
  .stat-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .stat-sub {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    color: var(--text-secondary, #6b6560);
  }

  /* ═══════ EVENTS ═══════ */
  .events-section, .portfolio-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-title {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .events-list {
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px;
    overflow: hidden;
  }

  .event-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .event-row:last-child { border-bottom: none; }

  .event-icon { font-size: 0.8rem; flex-shrink: 0; }
  .event-text {
    flex: 1;
    font-size: 0.78rem;
    color: var(--text-primary, #2D2D2D);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .event-time {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem;
    color: var(--text-muted, #9a9590);
    flex-shrink: 0;
  }

  /* ═══════ PORTFOLIO ═══════ */
  .portfolio-row {
    display: flex;
    gap: 12px;
  }

  .portfolio-stat {
    flex: 1;
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
  .portfolio-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
  }
  .portfolio-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.54rem;
    font-weight: 600;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ═══════ RESPONSIVE ═══════ */
  @media (max-width: 600px) {
    .dash-content { padding: 16px 12px 88px; gap: 14px; }
    .stat-grid { gap: 8px; }
    .stat-card { padding: 12px; }
    .stat-value { font-size: 1.1rem; }
    .hero-card { padding: 16px; }
    .portfolio-row { flex-direction: column; gap: 8px; }
  }
</style>
