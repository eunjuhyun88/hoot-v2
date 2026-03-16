<script lang="ts">
  import { router } from "../stores/router.ts";
  import { fly, fade } from 'svelte/transition';
  import { DEMO_MODEL, EXPERIMENT_LOG, SPARK_DATA } from "../data/modelDetailData.ts";
  import ModelCardTab from "../components/ModelCardTab.svelte";
  import ExperimentsTab from "../components/ExperimentsTab.svelte";
  import BenchmarkTab from "../components/BenchmarkTab.svelte";
  import PlaygroundTab from "../components/PlaygroundTab.svelte";
  import ApiTab from "../components/ApiTab.svelte";
  import ModelSidebar from "../components/ModelSidebar.svelte";
  import PixelIcon from "../components/PixelIcon.svelte";

  let activeTab: 'card' | 'playground' | 'api' | 'experiments' | 'benchmark' = 'card';

  // UX-MD4: "Use this model" dropdown
  let dropdownOpen = false;
  let deployModalOpen = false;
  let downloadModalOpen = false;
  function toggleDropdown() { dropdownOpen = !dropdownOpen; }
  function closeDropdown() { dropdownOpen = false; }

  function handleDeploy() {
    closeDropdown();
    deployModalOpen = true;
  }
  function handleDownload() {
    closeDropdown();
    downloadModalOpen = true;
  }
  function handleFork() {
    closeDropdown();
    router.navigate('ontology');
  }

  const m = DEMO_MODEL;
  const experimentLog = EXPERIMENT_LOG;

  // Sparkline path computation
  const sparkData = SPARK_DATA;
  const sparkMax = Math.max(...sparkData);
  const sparkPath = sparkData.map((v, i) => {
    const x = (i / (sparkData.length - 1)) * 120;
    const y = 28 - (v / sparkMax) * 24;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const sparkArea = sparkPath + ` L120,28 L0,28 Z`;

  function handleSwitchTab(e: CustomEvent<string>) {
    activeTab = e.detail as typeof activeTab;
  }
</script>

<div class="detail">
  <!-- UX-MD2: Accessible breadcrumb -->
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <button class="bc-link" on:click={() => router.navigate('studio')}>Studio</button>
    <span class="bc-sep">/</span>
    <button class="bc-link" on:click={() => router.navigate('models')}>Models</button>
    <span class="bc-sep">/</span>
    <span class="bc-current">{m.slug}</span>
  </nav>

  <!-- Main Content: 2-column -->
  <div class="content-layout">
    <!-- Left: Tab Content -->
    <div class="content-main">

      <!-- Model Header -->
      <header class="model-header">
        <div class="header-top">
          <div class="header-identity">
            <div class="header-icon">
              <PixelIcon type="layers" size={24} />
            </div>
            <div>
              <h1 class="model-name">{m.name}</h1>
              <span class="model-slug">{m.slug}</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="like-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              {m.likes}
            </button>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="action-dropdown" on:mouseleave={closeDropdown}>
              <button class="action-btn primary" on:click={toggleDropdown} aria-haspopup="true" aria-expanded={dropdownOpen}>
                Use this model
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="chevron" class:chevron-open={dropdownOpen}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              {#if dropdownOpen}
              <div class="dropdown-menu" transition:fly={{ y: -8, duration: 150 }}>
                <button class="dropdown-item" on:click={handleDeploy}>
                  <PixelIcon type="deploy" size={14} />
                  Deploy
                </button>
                <button class="dropdown-item" on:click={handleDownload}>
                  <PixelIcon type="arrow" size={14} />
                  Download
                </button>
                <button class="dropdown-item" on:click={handleFork}>
                  <PixelIcon type="ontology" size={14} />
                  Fork &amp; Retrain
                </button>
              </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="header-tags">
          <span class="htag task">
            <PixelIcon type="chart" size={10} />
            Prediction
          </span>
          <span class="htag framework">{m.framework}</span>
          <span class="htag framework">{m.type}</span>
          <span class="htag license">{m.license}</span>
          {#each m.tags as tag}
            <span class="htag">{tag}</span>
          {/each}
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs" role="tablist" aria-label="Model sections">
        <button class="tab" class:active={activeTab === 'card'} role="tab" aria-selected={activeTab === 'card'} on:click={() => activeTab = 'card'}>
          <PixelIcon type="file" size={14} />
          Model Card
        </button>
        <button class="tab" class:active={activeTab === 'experiments'} role="tab" aria-selected={activeTab === 'experiments'} on:click={() => activeTab = 'experiments'}>
          <PixelIcon type="chart" size={14} />
          Experiments
          <span class="tab-count" class:tab-count-active={activeTab === 'experiments'}>{m.totalExperiments}</span>
        </button>
        <button class="tab" class:active={activeTab === 'benchmark'} role="tab" aria-selected={activeTab === 'benchmark'} on:click={() => activeTab = 'benchmark'}>
          <PixelIcon type="bars" size={14} />
          Benchmark
        </button>
        <button class="tab" class:active={activeTab === 'playground'} role="tab" aria-selected={activeTab === 'playground'} on:click={() => activeTab = 'playground'}>
          <PixelIcon type="play" size={14} />
          Playground
        </button>
        <button class="tab" class:active={activeTab === 'api'} role="tab" aria-selected={activeTab === 'api'} on:click={() => activeTab = 'api'}>
          <PixelIcon type="code" size={14} />
          API
        </button>
      </div>

      <!-- UX-MD1: Crossfade tab content -->
      {#key activeTab}
      <div class="tab-panel" in:fly={{ y: 8, duration: 200, delay: 60 }} out:fade={{ duration: 80 }}>
        {#if activeTab === 'card'}
          <ModelCardTab {m} />
        {:else if activeTab === 'experiments'}
          <ExperimentsTab {m} {experimentLog} />
        {:else if activeTab === 'benchmark'}
          <BenchmarkTab visible={activeTab === 'benchmark'} />
        {:else if activeTab === 'playground'}
          <PlaygroundTab />
        {:else if activeTab === 'api'}
          <ApiTab modelSlug={m.id} />
        {/if}
      </div>
      {/key}
    </div>

    <!-- Right: Sidebar -->
    <ModelSidebar {m} {sparkPath} {sparkArea} on:switchTab={handleSwitchTab} />
  </div>
</div>

<!-- Deploy Modal -->
{#if deployModalOpen}
  <div class="modal-backdrop" on:click={() => deployModalOpen = false} transition:fade={{ duration: 150 }}>
    <div class="modal-card" on:click|stopPropagation transition:fly={{ y: 20, duration: 200 }}>
      <h3 class="modal-title">Deploy Model</h3>
      <p class="modal-desc">Deploy {m.name} as an API endpoint.</p>
      <div class="modal-endpoint">
        <span class="modal-label">Endpoint URL</span>
        <code class="modal-url">https://api.hoot.network/v1/models/{m.slug}/predict</code>
      </div>
      <div class="modal-actions">
        <button class="modal-btn secondary" on:click={() => deployModalOpen = false}>Cancel</button>
        <button class="modal-btn primary" on:click={() => { deployModalOpen = false; activeTab = 'api'; }}>Confirm Deploy</button>
      </div>
    </div>
  </div>
{/if}

<!-- Download Modal -->
{#if downloadModalOpen}
  <div class="modal-backdrop" on:click={() => downloadModalOpen = false} transition:fade={{ duration: 150 }}>
    <div class="modal-card" on:click|stopPropagation transition:fly={{ y: 20, duration: 200 }}>
      <h3 class="modal-title">Download Model</h3>
      <p class="modal-desc">Download model files for {m.name}.</p>
      <div class="modal-files">
        <button class="modal-file-row">
          <span class="file-name">model.pt</span>
          <span class="file-size">142 MB</span>
        </button>
        <button class="modal-file-row">
          <span class="file-name">config.json</span>
          <span class="file-size">2.1 KB</span>
        </button>
        <button class="modal-file-row">
          <span class="file-name">tokenizer.json</span>
          <span class="file-size">512 KB</span>
        </button>
      </div>
      <div class="modal-actions">
        <button class="modal-btn secondary" on:click={() => downloadModalOpen = false}>Close</button>
        <button class="modal-btn primary" on:click={() => downloadModalOpen = false}>Download All</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ═══ Modals ═══ */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
  }
  .modal-card {
    background: var(--surface, #fff); border-radius: 16px;
    padding: 28px; max-width: 440px; width: 90%;
    box-shadow: 0 16px 48px rgba(0,0,0,0.16);
  }
  .modal-title {
    font-size: 1.1rem; font-weight: 700; margin: 0 0 8px;
    color: var(--text-primary, #2D2D2D);
  }
  .modal-desc {
    font-size: 0.78rem; color: var(--text-muted, #9a9590);
    margin: 0 0 16px; line-height: 1.5;
  }
  .modal-endpoint {
    background: var(--page-bg, #FAF9F7); border-radius: 10px;
    padding: 12px 14px; margin-bottom: 20px;
  }
  .modal-label {
    display: block; font-size: 0.6rem; font-weight: 600;
    color: var(--text-muted, #9a9590); text-transform: uppercase;
    letter-spacing: 0.06em; margin-bottom: 6px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .modal-url {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem; color: var(--accent, #D97757);
    word-break: break-all;
  }
  .modal-files { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; }
  .modal-file-row {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--page-bg, #FAF9F7); border-radius: 8px;
    padding: 10px 14px; display: flex; justify-content: space-between;
    cursor: pointer; transition: border-color 150ms;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .modal-file-row:hover { border-color: var(--accent, #D97757); }
  .file-name { font-size: 0.76rem; color: var(--text-primary, #2D2D2D); }
  .file-size { font-size: 0.66rem; color: var(--text-muted, #9a9590); }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .modal-btn {
    appearance: none; border: none; border-radius: 8px;
    padding: 8px 18px; font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
  }
  .modal-btn.secondary {
    background: transparent; color: var(--text-muted, #9a9590);
  }
  .modal-btn.secondary:hover { color: var(--text-primary, #2D2D2D); }
  .modal-btn.primary {
    background: var(--accent, #D97757); color: #fff;
  }
  .modal-btn.primary:hover {
    background: color-mix(in srgb, var(--accent, #D97757) 85%, #000);
  }
  .detail {
    max-width: 1280px;
    margin: 0 auto;
    padding: var(--space-6, 24px);
  }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: var(--space-4, 16px);
    font-size: 0.76rem;
    animation: fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .bc-link {
    appearance: none; border: none; background: none; padding: 0;
    font-size: inherit; color: var(--text-secondary, #6b6560); cursor: pointer;
  }
  .bc-link:hover { color: var(--accent, #D97757); }
  .bc-sep { color: var(--border, #E5E0DA); }
  .bc-current { color: var(--text-primary, #2D2D2D); font-weight: 500; }

  /* Header */
  .model-header {
    margin-bottom: var(--space-5, 20px);
  }
  .header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4, 16px);
    margin-bottom: var(--space-3, 12px);
  }
  .header-identity {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3, 12px);
  }
  .header-icon {
    width: 44px; height: 44px;
    border-radius: var(--radius-lg, 16px);
    background: rgba(217, 119, 87, 0.08);
    color: var(--accent, #D97757);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: box-shadow 300ms ease;
  }
  .header-icon:hover {
    box-shadow: 0 0 20px rgba(217, 119, 87, 0.15);
  }
  .model-name {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.5rem; font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0 0 2px; line-height: 1.2;
  }
  .model-slug {
    font-size: 0.76rem;
    color: var(--text-muted, #9a9590);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }

  .header-actions {
    display: flex; gap: 8px; flex-shrink: 0;
  }
  .like-btn {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    padding: 7px 14px;
    border-radius: var(--radius-sm, 6px);
    font-size: 0.78rem; font-weight: 600;
    color: var(--text-secondary, #6b6560);
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: all 200ms ease;
  }
  .like-btn:hover { border-color: var(--red, #c0392b); color: var(--red, #c0392b); box-shadow: 0 0 8px rgba(192, 57, 43, 0.15); transform: translateY(-1px); }

  .action-btn.primary {
    appearance: none; border: none;
    background: var(--accent, #D97757);
    color: #fff;
    padding: 8px 16px;
    border-radius: var(--radius-sm, 6px);
    font-size: 0.8rem; font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: all 200ms ease;
  }
  .action-btn.primary:hover { background: var(--accent-hover, #C4644A); box-shadow: 0 4px 12px rgba(217, 119, 87, 0.25); transform: translateY(-1px); }

  /* Tags */
  .header-tags {
    display: flex; flex-wrap: wrap; gap: 5px;
  }
  .htag {
    font-size: 0.66rem; font-weight: 500;
    padding: 3px 10px;
    border-radius: var(--radius-pill, 100px);
    background: var(--border-subtle, #EDEAE5);
    color: var(--text-secondary, #6b6560);
    display: inline-flex; align-items: center; gap: 4px;
  }
  .htag.task {
    background: rgba(217, 119, 87, 0.1);
    color: var(--accent, #D97757);
  }
  .htag.framework {
    background: rgba(45, 108, 162, 0.08);
    color: var(--blue, #2d6ca2);
  }
  .htag.license {
    background: rgba(39, 134, 74, 0.08);
    color: var(--green, #27864a);
  }

  /* Tabs */
  .tabs {
    display: flex; gap: 4px;
    margin-bottom: var(--space-5, 20px);
    overflow-x: auto;
    padding: 4px;
    background: var(--border-subtle, #EDEAE5);
    border-radius: var(--radius-md, 10px);
  }
  .tab {
    appearance: none; border: none; background: none;
    padding: 8px 16px;
    font-size: 0.8rem; font-weight: 500;
    color: var(--text-secondary, #6b6560);
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    position: relative;
    transition: all 150ms;
    white-space: nowrap;
    border-radius: 8px;
  }
  .tab:hover { color: var(--text-primary, #2D2D2D); background: rgba(255,255,255,0.5); }
  .tab.active {
    color: var(--text-primary, #2D2D2D); font-weight: 600;
    background: var(--surface, #fff);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .tab-count {
    font-size: 0.62rem; font-weight: 600;
    background: var(--border-subtle, #EDEAE5);
    color: var(--text-muted, #9a9590);
    padding: 1px 6px; border-radius: 8px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    transition: background 200ms, color 200ms;
  }
  /* UX-MD5: Tab count accent on active */
  .tab-count-active {
    background: rgba(217, 119, 87, 0.15);
    color: var(--accent, #D97757);
  }

  /* UX-MD4: Dropdown menu */
  .action-dropdown {
    position: relative;
  }
  .chevron {
    transition: transform 200ms ease;
  }
  .chevron-open {
    transform: rotate(180deg);
  }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-md, 10px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 4px;
    min-width: 160px;
    z-index: var(--z-popover, 50);
  }
  .dropdown-item {
    appearance: none;
    border: none;
    background: none;
    width: 100%;
    padding: 8px 12px;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-primary, #2D2D2D);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 6px;
    transition: background 100ms;
    text-align: left;
  }
  .dropdown-item:hover {
    background: var(--page-bg, #FAF9F7);
  }

  /* Content Layout */
  .content-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-8, 32px);
    align-items: start;
    animation: fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both;
  }

  /* UX-MD3: Sidebar sticky */
  .content-layout :global(.content-sidebar) {
    position: sticky;
    top: calc(var(--header-height, 52px) + 16px);
  }

  /* Responsive */
  @media (max-width: 960px) {
    .content-layout { grid-template-columns: 1fr; }
    .content-layout :global(.content-sidebar) { position: static; }
  }
  @media (max-width: 600px) {
    .detail { padding: var(--space-3, 12px); }
    .header-top { flex-direction: column; }
    .header-actions { width: 100%; }
    .model-name { font-size: 1.2rem; }
  }

  /* C-1: prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .breadcrumb, .content-layout { animation: none !important; }
    .chevron { transition: none; }
    .tab-count { transition: none; }
  }
</style>
