<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { fly } from "svelte/transition";
  import MeshCanvas from "../components/MeshCanvas.svelte";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { agentStore, type AgentMessage } from "../stores/agentStore.ts";
  import { wallet } from "../stores/walletStore.ts";
  import { router } from "../stores/router.ts";
  import PixelIcon from "../components/PixelIcon.svelte";

  let chatScrollEl: HTMLDivElement;

  onMount(() => {
    dashboardStore.init();
    agentStore.greet();
    return () => dashboardStore.destroy();
  });

  afterUpdate(() => {
    if (chatScrollEl) chatScrollEl.scrollTop = chatScrollEl.scrollHeight;
  });

  $: ds = $dashboardStore;
  $: msgList = $agentStore_messages;
  const agentStore_messages = agentStore.messages;

  // Show chat if there are messages beyond the greeting
  $: hasConversation = msgList.length > 1;

  // Running jobs hero
  $: heroJob = ds.liveJobs.find(j => j.status === 'running');
  $: heroProgress = heroJob
    ? Math.round(((heroJob.metrics?.epoch ?? 0) / Math.max(heroJob.metrics?.totalEpochs ?? 1, 1)) * 100)
    : 0;

  function nav(view: string) {
    router.navigate(view as any);
  }

  function handleAction(key: string) {
    agentStore.handleAction(key);
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
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
    <!-- Agent Chat + Running Research (inline hero) -->
    <div class="hero-zone" in:fly={{ y: 12, duration: 250 }}>
      <!-- Running research banner -->
      {#if heroJob}
        <button class="running-banner" on:click={() => nav('research')}>
          <span class="running-dot"></span>
          <span class="running-topic">{heroJob.topic}</span>
          <span class="running-pct">{heroProgress}%</span>
          <span class="running-link">보기 →</span>
        </button>
      {/if}

      <!-- Agent conversation area -->
      <div class="agent-chat" bind:this={chatScrollEl}>
        {#each msgList as msg (msg.id)}
          <div class="chat-msg chat-msg--{msg.role}">
            {#if msg.role === 'agent'}
              <span class="chat-avatar">🦉</span>
            {/if}
            <div class="chat-bubble">
              <p class="chat-text">{msg.text}</p>
              {#if msg.meta?.progress !== undefined}
                <div class="chat-progress">
                  <div class="chat-progress-bar" style="width: {msg.meta.progress}%"></div>
                </div>
              {/if}
              {#if msg.actions?.length}
                <div class="chat-actions">
                  {#each msg.actions as action}
                    <button
                      class="chat-action chat-action--{action.variant || 'secondary'}"
                      on:click={() => handleAction(action.key)}
                    >{action.label}</button>
                  {/each}
                </div>
              {/if}
              <span class="chat-time">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

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

  /* ═══════ HERO ZONE (chat + running banner) ═══════ */
  .hero-zone {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  /* Running research banner */
  .running-banner {
    appearance: none;
    border: none;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    background: rgba(217, 119, 87, 0.06);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background 150ms;
    width: 100%;
    text-align: left;
  }
  .running-banner:hover { background: rgba(217, 119, 87, 0.1); }

  .running-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent, #D97757);
    animation: pulse 1.5s ease infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .running-topic {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary, #2D2D2D);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .running-pct {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--accent, #D97757);
  }
  .running-link {
    font-size: 0.68rem;
    color: var(--text-muted, #9a9590);
    flex-shrink: 0;
  }

  /* Agent chat area */
  .agent-chat {
    max-height: 280px;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.06) transparent;
  }

  .chat-msg {
    display: flex;
    gap: 8px;
    max-width: 100%;
  }
  .chat-msg--user { justify-content: flex-end; }
  .chat-msg--system { justify-content: center; }

  .chat-avatar {
    font-size: 0.9rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .chat-bubble { max-width: 85%; }

  .chat-msg--user .chat-bubble {
    background: var(--accent, #D97757);
    color: #fff;
    border-radius: 14px 14px 4px 14px;
    padding: 8px 14px;
  }
  .chat-msg--agent .chat-bubble {
    background: var(--page-bg, #FAF9F7);
    color: var(--text-primary, #2D2D2D);
    border-radius: 14px 14px 14px 4px;
    padding: 8px 14px;
  }
  .chat-msg--system .chat-bubble { background: none; text-align: center; }
  .chat-msg--system .chat-text {
    font-size: 0.68rem;
    color: var(--text-muted, #9a9590);
    font-style: italic;
  }

  .chat-text {
    font-size: 0.82rem;
    line-height: 1.55;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .chat-time {
    display: block;
    font-size: 0.54rem;
    color: var(--text-muted, #9a9590);
    margin-top: 3px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .chat-msg--user .chat-time {
    color: rgba(255, 255, 255, 0.45);
    text-align: right;
  }

  .chat-progress {
    width: 100%; height: 3px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
  }
  .chat-progress-bar {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    transition: width 300ms ease;
  }

  .chat-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .chat-action {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.72rem;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .chat-action:hover {
    border-color: var(--accent, #D97757);
    color: var(--accent, #D97757);
  }
  .chat-action--primary {
    background: var(--accent, #D97757);
    color: #fff;
    border-color: var(--accent, #D97757);
  }
  .chat-action--primary:hover {
    background: color-mix(in srgb, var(--accent, #D97757) 85%, #000);
    color: #fff;
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
