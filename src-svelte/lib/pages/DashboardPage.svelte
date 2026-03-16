<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import MeshCanvas from "../components/MeshCanvas.svelte";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { wallet } from "../stores/walletStore.ts";
  import { router } from "../stores/router.ts";
  import { toasts } from "../stores/toastStore.ts";
  import { jobStore, completedCount } from "../stores/jobStore.ts";

  onMount(() => {
    dashboardStore.init();
    return () => dashboardStore.destroy();
  });

  $: ds = $dashboardStore;

  // Derive research state for dynamic card content
  type ResearchState = 'none' | 'running' | 'complete' | 'deployed';
  $: researchState = ((): ResearchState => {
    const phase = $jobStore.phase;
    if (phase === 'running' || phase === 'setup') return 'running';
    if (phase === 'complete' || phase === 'publish') return 'complete';
    if (phase === 'published') return 'deployed';
    if (ds.researchSummary.runningJobs > 0) return 'running';
    if (ds.modelsSummary.count > 0 && ds.researchSummary.completedJobs > 0) return 'deployed';
    return 'none';
  })();

  $: researchProgress = $jobStore.totalExperiments > 0
    ? Math.round(($completedCount / $jobStore.totalExperiments) * 100)
    : 0;

  // Track which pillar card has its quick-actions expanded
  let expandedCard: 'studio' | 'network' | 'protocol' | null = null;

  function toggleCard(card: typeof expandedCard) {
    expandedCard = expandedCard === card ? null : card;
  }

  function nav(view: string) {
    expandedCard = null;
    router.navigate(view as any);
  }

  // Quick action: start research with a topic
  let quickTopic = '';
  function quickResearch() {
    const topic = quickTopic.trim();
    if (!topic) return;
    router.navigate('studio' as any, { topic });
    quickTopic = '';
    expandedCard = null;
  }

  function quickRegisterNode() {
    toasts.info('Node Registration', 'Register your GPU node on the Network page');
    nav('network');
  }
</script>

<div class="hoot-home" class:mounted={ds.mounted}>
  <div class="globe-layer">
    <MeshCanvas
      nodes={ds.renderNodes}
      jobs={ds.model.jobs}
      workers={ds.model.workers}
      viewerLocation={{ lat: 37.57, lng: 126.98 }}
    />
  </div>

  <div class="home-content">
    <!-- Header -->
    <div class="home-header" in:fade={{ duration: 400 }}>
      <div class="hh-logo">🦉</div>
      <h1 class="hh-title">HOOT Protocol</h1>
      <p class="hh-sub">Decentralized AI Research Infrastructure</p>
    </div>

    <!-- 3 Pillars -->
    <div class="pillar-grid">
      <!-- Magnet Studio -->
      <div class="pillar-wrap">
        <button class="pillar-card pillar--studio" on:click={() => toggleCard('studio')}>
          <div class="pc-icon">🔬</div>
          <div class="pc-body">
            <h2 class="pc-title">Magnet Studio</h2>
            {#if researchState === 'running'}
              <p class="pc-desc">Research in progress · {$jobStore.topic || 'AI Research'}</p>
              <div class="pc-stats">
                <span class="pc-stat pc-stat--pulse">{researchProgress}% complete</span>
                <span class="pc-stat">{$completedCount}/{$jobStore.totalExperiments} exp</span>
              </div>
            {:else if researchState === 'complete'}
              <p class="pc-desc">Research complete · Ready to deploy</p>
              <div class="pc-stats">
                <span class="pc-stat pc-stat--green">Complete</span>
                <span class="pc-stat">{ds.modelsSummary.count} models</span>
              </div>
            {:else if researchState === 'deployed'}
              <p class="pc-desc">Model deployed · Serving</p>
              <div class="pc-stats">
                <span class="pc-stat pc-stat--green">{ds.modelsSummary.count} models</span>
                <span class="pc-stat">{ds.researchSummary.completedJobs} jobs</span>
              </div>
            {:else}
              <p class="pc-desc">Autonomous AI research · Train · Deploy</p>
              <div class="pc-stats">
                <span class="pc-stat">{ds.researchSummary.runningJobs} jobs</span>
                <span class="pc-stat">{ds.modelsSummary.count} models</span>
              </div>
            {/if}
          </div>
          <span class="pc-arrow" class:pc-arrow--open={expandedCard === 'studio'}>→</span>
        </button>
        {#if expandedCard === 'studio'}
          <div class="qa-panel" transition:slide={{ duration: 200 }}>
            {#if researchState === 'running'}
              <!-- Running: show progress + go to research -->
              <div class="qa-progress">
                <div class="qa-progress-bar">
                  <div class="qa-progress-fill" style="width: {researchProgress}%"></div>
                </div>
                <span class="qa-progress-label">{$jobStore.topic}</span>
              </div>
              <div class="qa-links">
                <button class="qa-link qa-link--accent" on:click={() => nav('research')}>View Progress</button>
                <button class="qa-link" on:click={() => nav('studio')}>Open Studio</button>
              </div>
            {:else if researchState === 'complete'}
              <!-- Complete: deploy prompt -->
              <div class="qa-status-msg">Research complete. Deploy your model now.</div>
              <div class="qa-links">
                <button class="qa-link qa-link--accent" on:click={() => nav('models')}>Deploy Model</button>
                <button class="qa-link" on:click={() => nav('research')}>View Results</button>
                <button class="qa-link" on:click={() => nav('studio')}>New Research</button>
              </div>
            {:else if researchState === 'deployed'}
              <!-- Deployed: model stats -->
              <div class="qa-links">
                <button class="qa-link" on:click={() => nav('models')}>Manage Models</button>
                <button class="qa-link" on:click={() => nav('studio')}>New Research</button>
                <button class="qa-link" on:click={() => nav('research')}>Research History</button>
              </div>
            {:else}
              <!-- None: topic input -->
              <form class="qa-form" on:submit|preventDefault={quickResearch}>
                <input class="qa-input" bind:value={quickTopic} placeholder="Enter research topic..." autocomplete="off" />
                {#if quickTopic.trim()}
                  <button class="qa-go" type="submit">Start →</button>
                {/if}
              </form>
              <div class="qa-links">
                <button class="qa-link" on:click={() => nav('studio')}>Open Studio</button>
                <button class="qa-link" on:click={() => nav('models')}>Browse Models</button>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- GPU Network -->
      <div class="pillar-wrap">
        <button class="pillar-card pillar--network" on:click={() => toggleCard('network')}>
          <div class="pc-icon">🌐</div>
          <div class="pc-body">
            <h2 class="pc-title">GPU Network</h2>
            <p class="pc-desc">Register idle GPUs · Contribute compute · Earn rewards</p>
            <div class="pc-stats">
              <span class="pc-stat pc-stat--green">{ds.networkSummary.nodes} nodes</span>
              <span class="pc-stat pc-stat--green">{ds.networkSummary.gpuCount} GPUs</span>
            </div>
          </div>
          <span class="pc-arrow" class:pc-arrow--open={expandedCard === 'network'}>→</span>
        </button>
        {#if expandedCard === 'network'}
          <div class="qa-panel" transition:slide={{ duration: 200 }}>
            <div class="qa-links">
              <button class="qa-link" on:click={() => nav('network')}>Network Map</button>
              <button class="qa-link" on:click={quickRegisterNode}>Register Node</button>
              <button class="qa-link" on:click={() => nav('network')}>View Rewards</button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Protocol -->
      <div class="pillar-wrap">
        <button class="pillar-card pillar--protocol" on:click={() => toggleCard('protocol')}>
          <div class="pc-icon">🏛</div>
          <div class="pc-body">
            <h2 class="pc-title">Protocol</h2>
            <p class="pc-desc">Bond HOOT · Stake · Participate in governance</p>
            <div class="pc-stats">
              <span class="pc-stat">{ds.protocolSummary.tvl} TVL</span>
              {#if $wallet.connected}
                <span class="pc-stat">{ds.portfolioSummary.bondCount} bonds</span>
              {/if}
            </div>
          </div>
          <span class="pc-arrow" class:pc-arrow--open={expandedCard === 'protocol'}>→</span>
        </button>
        {#if expandedCard === 'protocol'}
          <div class="qa-panel" transition:slide={{ duration: 200 }}>
            <div class="qa-links">
              <button class="qa-link" on:click={() => nav('protocol')}>Bond / Stake</button>
              <button class="qa-link" on:click={() => nav('protocol')}>HOOT Burn</button>
              {#if !$wallet.connected}
                <button class="qa-link qa-link--accent" on:click={() => nav('protocol')}>Connect to participate</button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Activity Feed -->
    {#if ds.events.length > 0}
      <div class="activity-section">
        <h3 class="section-label">Recent Activity</h3>
        <div class="activity-list">
          {#each ds.events.slice(0, 5) as event}
            <div class="activity-row">
              <span class="activity-dot" class:activity-dot--research={event.type === 'research'}
                class:activity-dot--model={event.type === 'model'}
                class:activity-dot--network={event.type === 'network'}></span>
              <span class="activity-text">{event.message}</span>
              <span class="activity-time">{new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .hoot-home {
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
  .hoot-home.mounted { opacity: 1; }

  .globe-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    filter: saturate(0.3) sepia(0.02) opacity(0.06);
    pointer-events: none;
  }

  .home-content {
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    padding: 32px 20px 100px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ═══════ HEADER ═══════ */
  .home-header {
    text-align: center;
    padding: 16px 0 4px;
  }
  .hh-logo {
    font-size: 2.2rem;
    line-height: 1;
    margin-bottom: 8px;
  }
  .hh-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0;
    letter-spacing: -0.02em;
  }
  .hh-sub {
    font-size: 0.72rem;
    color: var(--text-muted, #9a9590);
    margin: 6px 0 0;
    letter-spacing: 0.03em;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }

  /* ═══════ PILLAR GRID ═══════ */
  .pillar-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pillar-card {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff);
    border-radius: 16px;
    padding: 20px 22px;
    cursor: pointer;
    transition: all 200ms ease;
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    text-align: left;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .pillar-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  }
  .pillar--studio:hover { border-color: var(--accent, #D97757); }
  .pillar--network:hover { border-color: var(--green, #27864a); }
  .pillar--protocol:hover { border-color: #8B6914; }

  .pc-icon {
    font-size: 1.6rem;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 14px;
  }
  .pillar--studio .pc-icon { background: rgba(217, 119, 87, 0.06); }
  .pillar--network .pc-icon { background: rgba(39, 134, 74, 0.06); }
  .pillar--protocol .pc-icon { background: rgba(139, 105, 20, 0.06); }

  .pc-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pc-title {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0;
  }
  .pc-desc {
    font-size: 0.7rem;
    color: var(--text-muted, #9a9590);
    line-height: 1.4;
    margin: 0;
  }
  .pc-stats {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
  .pc-stat {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem;
    font-weight: 600;
    color: var(--accent, #D97757);
    background: rgba(217, 119, 87, 0.06);
    padding: 2px 8px;
    border-radius: 100px;
  }
  .pc-stat--green {
    color: var(--green, #27864a);
    background: rgba(39, 134, 74, 0.06);
  }

  .pc-arrow {
    font-size: 1.1rem;
    color: var(--text-muted, #9a9590);
    flex-shrink: 0;
    transition: transform 200ms;
  }
  .pc-arrow--open { transform: rotate(90deg); color: var(--accent, #D97757); }
  .pillar-card:hover .pc-arrow:not(.pc-arrow--open) {
    transform: translateX(3px);
    color: var(--text-primary, #2D2D2D);
  }

  .pillar-wrap { display: flex; flex-direction: column; }

  /* ═══════ QUICK ACTION PANEL ═══════ */
  .qa-panel {
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-top: none;
    border-radius: 0 0 16px 16px;
    padding: 12px 18px 14px;
    margin-top: -1px;
  }
  .qa-form {
    display: flex; align-items: center;
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 10px; padding: 2px 2px 2px 12px;
    margin-bottom: 8px; transition: border-color 200ms;
  }
  .qa-form:focus-within { border-color: var(--accent, #D97757); }
  .qa-input {
    flex: 1; appearance: none; border: none; background: transparent;
    color: var(--text-primary, #2D2D2D); font-size: 0.76rem; padding: 7px 0;
    outline: none; font-family: var(--font-body, 'Inter', sans-serif); min-width: 0;
  }
  .qa-input::placeholder { color: var(--text-muted, #9a9590); font-size: 0.72rem; }
  .qa-go {
    appearance: none; border: none;
    background: var(--accent, #D97757); color: #fff;
    font-size: 0.68rem; font-weight: 600;
    padding: 6px 12px; border-radius: 8px;
    cursor: pointer; white-space: nowrap; transition: background 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .qa-go:hover { background: var(--accent-hover, #C4644A); }
  .qa-links { display: flex; gap: 6px; flex-wrap: wrap; }
  .qa-link {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: transparent; color: var(--text-muted, #9a9590);
    font-size: 0.6rem; font-weight: 500; padding: 4px 12px;
    border-radius: 100px; cursor: pointer; transition: all 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .qa-link:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }
  .qa-link--accent { color: var(--accent, #D97757); border-color: rgba(217, 119, 87, 0.3); }

  .qa-progress {
    margin-bottom: 8px;
  }
  .qa-progress-bar {
    height: 3px; background: var(--border-subtle, #EDEAE5);
    border-radius: 2px; overflow: hidden; margin-bottom: 6px;
  }
  .qa-progress-fill {
    height: 100%; background: var(--accent, #D97757);
    border-radius: 2px; transition: width 300ms;
    box-shadow: 0 0 4px rgba(217, 119, 87, 0.4);
  }
  .qa-progress-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.6rem; color: var(--text-muted, #9a9590);
    display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .qa-status-msg {
    font-size: 0.7rem; color: var(--text-secondary, #6b6560);
    padding: 6px 0; line-height: 1.4; margin-bottom: 4px;
  }

  .pc-stat--pulse { animation: stat-pulse 2s ease-in-out infinite; }
  @keyframes stat-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

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
    .home-content { padding: 16px 12px 88px; gap: 14px; }
    .home-header { padding: 8px 0 0; }
    .hh-title { font-size: 1.3rem; }
    .pillar-card { padding: 16px 16px; gap: 12px; }
  }
</style>
