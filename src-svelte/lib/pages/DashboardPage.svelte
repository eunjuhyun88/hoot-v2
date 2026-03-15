<script lang="ts">
  import { onMount } from "svelte";

  import MeshCanvas from "../components/MeshCanvas.svelte";
  import DashboardGrid from "../components/DashboardGrid.svelte";
  import InfoBar from "../components/InfoBar.svelte";
  import WidgetContainer from "../components/WidgetContainer.svelte";
  import JobsListWidget from "../components/widgets/JobsListWidget.svelte";
  import FindingsWidget from "../components/widgets/FindingsWidget.svelte";
  import EventLogWidget from "../components/widgets/EventLogWidget.svelte";
  import ModelsWidget from "../components/widgets/ModelsWidget.svelte";
  import BondsWidget from "../components/widgets/BondsWidget.svelte";
  import NetworkWidget from "../components/widgets/NetworkWidget.svelte";
  import EcosystemWidget from "../components/widgets/EcosystemWidget.svelte";
  import StatusPanel from "../components/StatusPanel.svelte";
  import { visibleWidgets } from "../stores/widgetStore.ts";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { router, type AppView } from "../stores/router.ts";
  import type { WidgetId } from "../data/widgetDefaults.ts";

  /** Map widget → detail page */
  const WIDGET_NAV: Partial<Record<WidgetId, AppView>> = {
    "status-panel": "research",
    "jobs-list": "research",
    "findings": "research",
    "event-log": "research",
    "my-models": "models",
    "my-bonds": "protocol",
    "network-status": "network",
    "ecosystem": "protocol",
  };

  onMount(() => {
    dashboardStore.init();
    return () => dashboardStore.destroy();
  });

  $: hasRunning = $dashboardStore.runningCount > 0;
  $: hasDone = $dashboardStore.doneCount > 0;
</script>

<div class="studio-home" class:mounted={$dashboardStore.mounted}>
  <!-- ═══════ INFO BAR ═══════ -->
  <InfoBar
    system={$dashboardStore.liveSystem}
    activeWorkers={$dashboardStore.networkSummary.activeWorkers}
    idleWorkers={$dashboardStore.networkSummary.idleWorkers}
    tvl={$dashboardStore.protocolSummary.tvl}
    burned={$dashboardStore.protocolSummary.burned}
    bonds={$dashboardStore.protocolSummary.bonds}
    trustScore={$dashboardStore.protocolSummary.trustScore}
    mauPercent={$dashboardStore.protocolSummary.mauPercent}
  />

  <!-- ═══════ MAIN CONTENT ═══════ -->
  <div class="main-area">
    <!-- Globe background (subtle) -->
    <div class="globe-layer">
      <MeshCanvas
        nodes={$dashboardStore.renderNodes}
        jobs={$dashboardStore.model.jobs}
        workers={$dashboardStore.model.workers}
        viewerLocation={{ lat: 37.57, lng: 126.98 }}
      />
    </div>

    <!-- ═══════ CONTEXT DASHBOARD ═══════ -->
    <div class="context-area">
      <!-- Status Cards Row -->
      <div class="status-cards">
        <button class="status-card" on:click={() => router.navigate('research')}>
          <span class="sc-icon">🔬</span>
          <div class="sc-body">
            <span class="sc-value">{$dashboardStore.runningCount}</span>
            <span class="sc-label">실행 중 리서치</span>
          </div>
          {#if hasRunning}
            <span class="sc-pulse"></span>
          {/if}
        </button>

        <button class="status-card" on:click={() => router.navigate('models')}>
          <span class="sc-icon">📦</span>
          <div class="sc-body">
            <span class="sc-value">{$dashboardStore.modelsSummary.count ?? 3}</span>
            <span class="sc-label">내 모델</span>
          </div>
        </button>

        <button class="status-card" on:click={() => router.navigate('network')}>
          <span class="sc-icon">🌐</span>
          <div class="sc-body">
            <span class="sc-value">{$dashboardStore.totalNodes}</span>
            <span class="sc-label">활성 노드</span>
          </div>
          <span class="sc-live"></span>
        </button>

        <button class="status-card" on:click={() => router.navigate('protocol')}>
          <span class="sc-icon">🔥</span>
          <div class="sc-body">
            <span class="sc-value">{$dashboardStore.protocolSummary.tvl}</span>
            <span class="sc-label">TVL</span>
          </div>
        </button>
      </div>

      <!-- Dashboard Grid (Active Research + Summary cards) -->
      <div class="grid-area">
        <DashboardGrid
          jobs={$dashboardStore.liveJobs}
          models={$dashboardStore.modelsSummary.models}
          nodes={$dashboardStore.liveSystem.nodes}
          activeWorkers={$dashboardStore.networkSummary.activeWorkers}
          gpuCount={Math.ceil($dashboardStore.liveSystem.nodes / 2)}
          tvl={$dashboardStore.protocolSummary.tvl}
          trustScore={$dashboardStore.protocolSummary.trustScore}
          burned={$dashboardStore.protocolSummary.burned}
        />
      </div>

      <!-- Widget Layer (progressive — user adds these) -->
      {#if $visibleWidgets.length > 0}
        <div class="widget-grid">
          {#each $visibleWidgets as w, i (w.id)}
            <div class="widget-enter" style:--widget-i={i}>
              <WidgetContainer config={w} detailView={WIDGET_NAV[w.id]}>
                {#if w.id === "status-panel"}
                  <StatusPanel
                    research={$dashboardStore.liveResearch}
                    runningCount={$dashboardStore.runningCount}
                    doneCount={$dashboardStore.doneCount}
                  />
                {:else if w.id === "jobs-list"}
                  <JobsListWidget jobs={$dashboardStore.liveJobs} />
                {:else if w.id === "findings"}
                  <FindingsWidget jobs={$dashboardStore.liveJobs} />
                {:else if w.id === "event-log"}
                  <EventLogWidget events={$dashboardStore.events} />
                {:else if w.id === "my-models"}
                  <ModelsWidget models={$dashboardStore.modelsSummary.models} />
                {:else if w.id === "my-bonds"}
                  <BondsWidget bonds={$dashboardStore.portfolioSummary.bonds} />
                {:else if w.id === "network-status"}
                  <NetworkWidget system={$dashboardStore.liveSystem} />
                {:else if w.id === "ecosystem"}
                  <EcosystemWidget
                    tvl={$dashboardStore.protocolSummary.tvl}
                    burned={$dashboardStore.protocolSummary.burned}
                    bonds={$dashboardStore.protocolSummary.bonds}
                    trustScore={$dashboardStore.protocolSummary.trustScore}
                    mauPercent={$dashboardStore.protocolSummary.mauPercent}
                  />
                {/if}
              </WidgetContainer>
            </div>
          {/each}
        </div>
      {/if}
    </div>
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
  }
  .studio-home.mounted { opacity: 1; }

  /* ═══════ MAIN AREA ═══════ */
  .main-area {
    flex: 1;
    position: relative;
    overflow-y: auto;
    min-height: 0;
  }

  /* ═══════ GLOBE BACKGROUND ═══════ */
  .globe-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    filter: saturate(0.3) sepia(0.02) opacity(0.12);
    pointer-events: none;
  }

  /* ═══════ CONTEXT AREA ═══════ */
  .context-area {
    position: relative;
    z-index: 1;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 1080px;
    margin: 0 auto;
    width: 100%;
  }

  /* ═══════ STATUS CARDS ═══════ */
  .status-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .status-card {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 150ms ease;
    position: relative;
    overflow: hidden;
  }

  .status-card:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 2px 12px rgba(217, 119, 87, 0.1);
    transform: translateY(-1px);
  }

  .sc-icon {
    font-size: 1.2rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .sc-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .sc-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    line-height: 1.2;
  }

  .sc-label {
    font-size: 0.65rem;
    color: var(--text-muted, #9a9590);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sc-pulse {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent, #D97757);
    box-shadow: 0 0 6px rgba(217, 119, 87, 0.5);
    animation: scPulse 2s ease-in-out infinite;
  }

  .sc-live {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green, #27864a);
    box-shadow: 0 0 6px rgba(39, 134, 74, 0.4);
    animation: scPulse 2s ease-in-out infinite;
  }

  @keyframes scPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ═══════ GRID AREA ═══════ */
  .grid-area {
    position: relative;
  }

  /* ═══════ WIDGET GRID ═══════ */
  .widget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 10px;
  }

  .widget-grid :global(.wc) {
    position: static !important;
    width: 100% !important;
    height: auto !important;
    z-index: auto !important;
  }

  .widget-grid :global(.wc-resize) {
    display: none;
  }

  .widget-grid :global(.wc-header) {
    cursor: default;
  }

  /* Widget staggered entry */
  .widget-enter {
    animation: widgetFadeInUp var(--dur-entrance, 700ms) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
    animation-delay: calc(var(--widget-i, 0) * 60ms + 100ms);
  }

  @keyframes widgetFadeInUp {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ═══════ RESPONSIVE ═══════ */
  @media (max-width: 900px) {
    .status-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .context-area {
      padding: 12px 12px;
    }
  }

  @media (max-width: 600px) {
    .status-cards {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .status-card {
      padding: 10px 12px;
      gap: 8px;
    }
    .sc-value { font-size: 0.95rem; }
    .sc-icon { font-size: 1rem; }
    .widget-grid {
      grid-template-columns: 1fr;
    }
    .context-area {
      padding: 8px 8px;
      gap: 10px;
    }
  }
</style>
