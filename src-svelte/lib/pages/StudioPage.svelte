<script lang="ts">
  import { onMount } from "svelte";
  import { fly, fade, slide } from "svelte/transition";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { studioStore, studioPhase, type ResourceMode } from "../stores/studioStore.ts";
  import { jobStore } from "../stores/jobStore.ts";
  import { nodeStore } from "../stores/nodeStore.ts";
  import { router } from "../stores/router.ts";
  import { readRuntimeConfig } from "../api/client.ts";
  import { isConnected } from "../stores/connectionStore.ts";
  import { wallet } from "../stores/walletStore.ts";
  import { toasts } from "../stores/toastStore.ts";
  import { ONTOLOGY_PRESETS, PRESET_META, type PresetDifficulty } from "../data/ontologyData.ts";
  import type { ContractCall } from "../data/protocolData.ts";
  import { modelPublishStore } from "../stores/modelPublishStore.ts";
  import PixelIcon from "../components/PixelIcon.svelte";
  import StudioPublish from "../components/studio/StudioPublish.svelte";
  import GPUOnboardWizard from "../components/studio/GPUOnboardWizard.svelte";
  import ContractCallModal from "../components/ContractCallModal.svelte";
  import CreditInsufficientModal from "../components/CreditInsufficientModal.svelte";

  let topicInput = '';
  let aiRecVisible = false;

  // Contract call modal state
  let modalOpen = false;
  let modalStep: 'review' | 'pending' | 'confirmed' = 'review';
  let modalCall: ContractCall | null = null;
  let pendingTopic = '';

  // Credit insufficient modal
  let creditModalOpen = false;
  let creditRequired = 12.5;
  let creditAvailable = 85.0;

  // GPU onboard wizard
  let gpuWizardOpen = false;

  onMount(() => {
    dashboardStore.init();
    studioStore.syncFromJobStore();
    nodeStore.init();
    return () => dashboardStore.destroy();
  });

  $: ds = $dashboardStore;
  $: phase = $studioPhase;
  $: stState = $studioStore;

  // Running jobs
  $: heroJob = ds.liveJobs.find(j => j.status === 'running');
  $: heroProgress = heroJob
    ? Math.round(((heroJob.metrics?.epoch ?? 0) / Math.max(heroJob.metrics?.totalEpochs ?? 1, 1)) * 100)
    : 0;

  // AI recommendation trigger: show after 3 chars
  $: if (topicInput.trim().length >= 3 && phase === 'step1' || phase === 'step2') {
    aiRecVisible = true;
  } else if (topicInput.trim().length < 3) {
    aiRecVisible = false;
  }

  // Preset data for recommendation panel
  $: presets = ONTOLOGY_PRESETS.slice(0, 4);

  function nav(view: string) {
    router.navigate(view as any);
  }

  // Phase transitions
  function goToCreate(prefill?: string) {
    topicInput = prefill ?? '';
    studioStore.startCreate(prefill);
  }

  function goBackToIdle() {
    studioStore.reset();
    topicInput = '';
    aiRecVisible = false;
  }

  function handleQuickStart() {
    const topic = topicInput.trim();
    if (!topic) return;

    // Check credit (simulated)
    if (creditAvailable < creditRequired) {
      creditModalOpen = true;
      return;
    }

    // Build contract call for confirmation
    pendingTopic = topic;
    modalCall = {
      title: 'Create Research Job',
      contract: '0x7a3f…ResearchRegistry',
      fn: 'createResearchJob',
      params: [
        { name: 'topic', type: 'string', value: topic },
        { name: 'resourceMode', type: 'uint8', value: stState.resourceMode },
        { name: 'maxExperiments', type: 'uint32', value: '60' },
      ],
      fee: `${creditRequired} HOOT`,
      gas: '~0.0008 ETH',
      note: 'AI will automatically configure experiments and search for optimal models. Experiment count and cost are estimates.',
      accentColor: 'var(--accent)',
    };
    modalStep = 'review';
    modalOpen = true;
  }

  function handleModalConfirm() {
    modalStep = 'pending';
    // Simulate tx confirmation
    setTimeout(() => {
      modalStep = 'confirmed';
      const txHash = `0x${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`;
      toasts.tx('Research Job Created', txHash, `${pendingTopic} research is starting`);
      // Actually launch after a brief confirmed display
      setTimeout(() => {
        modalOpen = false;
        studioStore.setTopic(pendingTopic);
        studioStore.startRunning();
        launchJob(pendingTopic);
      }, 1200);
    }, 2000);
  }

  function handleModalClose() {
    if (modalStep === 'pending') return; // Don't close during tx
    modalOpen = false;
    modalStep = 'review';
  }

  function handleAdvancedSetup() {
    const topic = topicInput.trim();
    if (!topic) return;
    studioStore.setTopic(topic);
    studioStore.goToSetup();
  }

  function selectPreset(preset: typeof presets[0]) {
    topicInput = preset.name;
    studioStore.setPreset(preset.id);
    studioStore.setTopic(preset.name);
  }

  function setResourceMode(mode: ResourceMode) {
    studioStore.setResourceMode(mode);
  }

  function launchJob(topic: string) {
    if ($isConnected) {
      const rc = readRuntimeConfig();
      void jobStore.startRuntimeJob(topic, rc).then((jobId) => {
        router.navigate('research', jobId ? { topic, jobId } : { topic });
      });
      return;
    }
    dashboardStore.startResearch(topic);
    topicInput = '';
  }

  // Legacy: direct start from IDLE
  function startResearch() {
    const topic = topicInput.trim();
    if (!topic) return;
    goToCreate(topic);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'idle') startResearch();
      else if (phase === 'step1' && topicInput.trim().length >= 2) {
        studioStore.goToStep2(topicInput.trim());
      }
      else if (phase === 'step2') handleQuickStart();
    }
    if (e.key === 'Escape') {
      if (phase === 'step2') studioStore.goBack();
      else if (phase === 'step1') goBackToIdle();
    }
  }

  const RESOURCE_MODES: { id: ResourceMode; label: string; desc: string }[] = [
    { id: 'demo', label: 'Demo', desc: 'Local simulation' },
    { id: 'local', label: 'Local', desc: 'Local GPU' },
    { id: 'network', label: 'Network', desc: 'HOOT mesh' },
    { id: 'hybrid', label: 'Hybrid', desc: 'Local + Network' },
  ];
</script>

<div class="studio-page" class:mounted={ds.mounted}>
  <div class="studio-content">

    {#if phase === 'idle'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- IDLE STATE: Multi-model studio dashboard              -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="studio-header" in:fade={{ duration: 300 }}>
        <button class="sh-back" on:click={() => nav('dashboard')}>← Home</button>
        <div class="sh-title-row">
          <PixelIcon type="sparkle" size={20} />
          <h1 class="sh-title">Magnet Studio</h1>
        </div>
        <p class="sh-sub">Train, evaluate, and deploy AI models on the HOOT mesh</p>
      </div>

      <!-- Stats Overview -->
      <div class="stats-row" in:fade={{ duration: 300, delay: 50 }}>
        <div class="stat-item">
          <span class="stat-val">{ds.liveJobs.filter(j => j.status === 'running').length}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-val">{$modelPublishStore.length}</span>
          <span class="stat-label">Models</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-val">{ds.researchSummary.totalExperiments ?? 0}</span>
          <span class="stat-label">Experiments</span>
        </div>
      </div>

      <!-- Primary CTA: New Research -->
      <button class="cta-new-research" on:click={() => goToCreate()}>
        <div class="cta-left">
          <PixelIcon type="research" size={20} />
          <div class="cta-text">
            <strong>New Research</strong>
            <span>Start a new AI model research project</span>
          </div>
        </div>
        <span class="cta-arrow">→</span>
      </button>

      <!-- Active Research Jobs -->
      {#if ds.liveJobs.length > 0}
        <div class="section-block" in:fly={{ y: 10, duration: 220 }}>
          <h3 class="section-label">Active Research</h3>
          <div class="jobs-list">
            {#each ds.liveJobs as job}
              {@const progress = Math.round(((job.metrics?.epoch ?? 0) / Math.max(job.metrics?.totalEpochs ?? 1, 1)) * 100)}
              <button class="job-row" on:click={() => nav('research')}>
                <div class="job-left">
                  <span class="job-status" class:job-status--running={job.status === 'running'} class:job-status--done={job.status === 'completed'}></span>
                  <div class="job-info">
                    <span class="job-topic">{job.topic}</span>
                    <div class="job-progress-wrap">
                      <div class="job-progress"><div class="job-progress-bar" style="width: {progress}%"></div></div>
                      <span class="job-pct">{progress}%</span>
                    </div>
                  </div>
                </div>
                <div class="job-right">
                  <span class="job-metric">{job.metrics?.bestMetric?.toFixed(4) ?? '—'}</span>
                  <span class="job-arrow">→</span>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- My Models -->
      <div class="section-block">
        <div class="section-header">
          <h3 class="section-label">My Models</h3>
          {#if $modelPublishStore.length > 0}
            <button class="section-action" on:click={() => nav('models')}>View All →</button>
          {/if}
        </div>
        {#if $modelPublishStore.length > 0}
          <div class="models-grid">
            {#each $modelPublishStore as model}
              <button class="model-card" on:click={() => nav('model-detail')}>
                <div class="model-card-top">
                  <PixelIcon type="portfolio" size={14} />
                  <span class="model-state" class:model-state--active={model.state === 'NETWORK_ACTIVE'}>
                    {model.state === 'NETWORK_ACTIVE' ? 'Live' : model.state === 'PAUSED' ? 'Paused' : 'Retired'}
                  </span>
                </div>
                <span class="model-card-name">{model.name}</span>
                <span class="model-card-meta">{model.metrics?.experiments ?? 0} exp · {model.metrics?.best?.toFixed(3) ?? '—'}</span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <PixelIcon type="portfolio" size={24} />
            <span class="empty-text">No models yet</span>
            <span class="empty-sub">Complete a research to deploy your first model</span>
          </div>
        {/if}
      </div>

      <!-- Quick Start Templates -->
      <div class="section-block">
        <h3 class="section-label">Quick Start Templates</h3>
        <div class="preset-grid">
          {#each presets as p}
            {@const meta = PRESET_META[p.id]}
            <button class="preset-card" on:click={() => goToCreate(p.name)}>
              <div class="preset-card-top">
                <span class="preset-icon">{meta?.icon ?? '⚡'}</span>
                {#if meta}
                  <span class="preset-difficulty preset-difficulty--{meta.difficulty}">{meta.difficulty}</span>
                {/if}
              </div>
              <span class="preset-name">{p.name}</span>
              <span class="preset-desc">{p.description ?? ''}</span>
              {#if meta}
                <div class="preset-card-footer">
                  <span class="preset-time">{meta.estimatedTime}</span>
                  <div class="preset-tags">
                    {#each meta.techTags as tag}
                      <span class="preset-tag">{tag}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Quick Links -->
      <div class="quick-links">
        <button class="quick-link" on:click={() => nav('ontology')}>
          <PixelIcon type="ontology" size={14} />
          <span>Advanced Config</span>
        </button>
        {#if !$nodeStore.hasActiveNode}
          <button class="quick-link" on:click={() => gpuWizardOpen = true}>
            <PixelIcon type="globe" size={14} />
            <span>Register GPU</span>
          </button>
        {/if}
        <button class="quick-link" on:click={() => nav('models')}>
          <PixelIcon type="grid" size={14} />
          <span>Model Hub</span>
        </button>
      </div>

    {:else if phase === 'step1' || phase === 'step2'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CREATE STATE: Topic input + AI recommendation       -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="create-header" in:fly={{ y: -10, duration: 200 }}>
        <button class="sh-back" on:click={goBackToIdle}>← Studio</button>
        <div class="step-indicator">
          <div class="step-dot" class:step-dot--active={true} class:step-dot--done={phase === 'step2'}></div>
          <div class="step-line" class:step-line--active={phase === 'step2'}></div>
          <div class="step-dot" class:step-dot--active={phase === 'step2'}></div>
        </div>
        <span class="step-label">Step {phase === 'step1' ? '1' : '2'} of 2 — {phase === 'step1' ? 'Topic' : 'Configure'}</span>
        <h1 class="sh-title">New Research</h1>
        <p class="sh-sub">{phase === 'step1' ? 'What would you like to research?' : 'Review configuration and launch'}</p>
      </div>

      <div class="create-input-section" in:fly={{ y: 10, duration: 250, delay: 50 }}>
        <label class="create-label">Research Topic</label>
        <div class="create-input-wrap">
          <input
            bind:value={topicInput}
            on:keydown={handleKeydown}
            class="create-input"
            placeholder="e.g. Bitcoin price prediction, Protein folding, ..."
            autocomplete="off"
            spellcheck="false"
            autofocus
          />
        </div>
      </div>

      <!-- AI Recommendation Panel (slides in after 3 chars) -->
      {#if aiRecVisible}
        <div class="ai-rec-panel" in:slide={{ duration: 250 }}>
          <div class="ai-rec-header">
            <span class="ai-rec-icon">AI</span>
            <span class="ai-rec-title">Recommended Configuration</span>
          </div>

          <!-- Preset Chips -->
          <div class="preset-chips">
            {#each presets as p}
              <button
                class="preset-chip"
                class:preset-chip--active={stState.createPreset === p.id}
                on:click={() => selectPreset(p)}
              >
                {p.name}
              </button>
            {/each}
          </div>

          <!-- Ontology Preview -->
          <div class="ai-rec-preview">
            <div class="ai-rec-row">
              <span class="ai-rec-label">Branches</span>
              <span class="ai-rec-val">Architecture, Optimization, Data, Evaluation</span>
            </div>
            <div class="ai-rec-row">
              <span class="ai-rec-label">Experiments</span>
              <span class="ai-rec-val">~60 experiments</span>
            </div>
            <div class="ai-rec-row">
              <span class="ai-rec-label">Est. Cost</span>
              <span class="ai-rec-val">~12.5 HOOT</span>
            </div>
            <div class="ai-rec-row">
              <span class="ai-rec-label">Metric</span>
              <span class="ai-rec-val">val_bpb (lower is better)</span>
            </div>
          </div>

          <!-- Resource Mode -->
          <div class="resource-section">
            <span class="resource-label">Resource Mode</span>
            <div class="resource-modes">
              {#each RESOURCE_MODES as rm}
                <button
                  class="rm-btn"
                  class:rm-btn--active={stState.resourceMode === rm.id}
                  on:click={() => setResourceMode(rm.id)}
                >
                  <span class="rm-name">{rm.label}</span>
                  <span class="rm-desc">{rm.desc}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="create-actions" in:fly={{ y: 10, duration: 250, delay: 100 }}>
        <button
          class="create-btn create-btn--primary"
          disabled={topicInput.trim().length < 2}
          on:click={handleQuickStart}
        >
          Start Research →
        </button>
        <button
          class="create-btn create-btn--secondary"
          disabled={topicInput.trim().length < 2}
          on:click={handleAdvancedSetup}
        >
          Advanced Setup
        </button>
      </div>

    {:else if phase === 'setup'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- SETUP STATE: Advanced ontology configuration         -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="setup-section" in:fly={{ y: 10, duration: 300 }}>
        <button class="sh-back" on:click={() => studioStore.goBack()}>← Back</button>
        <h1 class="sh-title">Advanced Setup</h1>
        <p class="sh-sub">Configure experiment branches, models, and parameters manually</p>
        {#await import('../components/studio/OntologySetup.svelte') then mod}
          <svelte:component
            this={mod.default}
            on:launch={(e) => {
              studioStore.startRunning();
              launchJob(stState.createTopic);
            }}
            on:back={() => studioStore.goBack()}
          />
        {/await}
      </div>

    {:else if phase === 'complete'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- COMPLETE STATE: shown when returning from research   -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="complete-section" in:fly={{ y: 10, duration: 300 }}>
        <button class="sh-back" on:click={goBackToIdle}>← Studio</button>
        <h1 class="sh-title">Research Complete</h1>
        <p class="sh-sub">{stState.createTopic || 'Research'} completed</p>

        <div class="complete-summary">
          <div class="cs-row"><span class="cs-label">Topic</span><span class="cs-val">{stState.createTopic}</span></div>
          <div class="cs-row"><span class="cs-label">Status</span><span class="cs-val cs-val--done">Complete</span></div>
        </div>

        <div class="complete-actions">
          <button class="ca-btn ca-btn--deploy" on:click={() => {
            studioStore.goToPublish();
          }}>
            <span class="ca-icon">🚀</span>
            <span class="ca-text">
              <strong>Deploy</strong>
              <small>Deploy and mint model</small>
            </span>
          </button>
          <button class="ca-btn ca-btn--retrain" on:click={() => {
            const topic = stState.createTopic;
            studioStore.reset();
            goToCreate(topic);
          }}>
            <span class="ca-icon">🔄</span>
            <span class="ca-text">
              <strong>Retrain</strong>
              <small>Retrain with same settings</small>
            </span>
          </button>
          <button class="ca-btn ca-btn--improve" on:click={() => {
            const topic = stState.createTopic + ' (improved)';
            studioStore.reset();
            goToCreate(topic);
          }}>
            <span class="ca-icon">💡</span>
            <span class="ca-text">
              <strong>Improve</strong>
              <small>Research with improved settings</small>
            </span>
          </button>
        </div>

        <button class="create-btn create-btn--secondary" style="margin-top: 12px;" on:click={() => nav('research')}>
          View Research Details →
        </button>
      </div>

    {:else if phase === 'publish'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- PUBLISH STATE: Model mint wizard                     -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="publish-section" in:fly={{ y: 10, duration: 300 }}>
        <button class="sh-back" on:click={() => studioStore.setPhase('complete')}>← Back to Results</button>
        <h1 class="sh-title">Deploy Model</h1>
        <p class="sh-sub">Deploy research results to the HOOT network</p>
        <StudioPublish
          topic={stState.createTopic}
          bestMetric={$jobStore.bestMetric === Infinity ? 0 : $jobStore.bestMetric}
          experiments={$jobStore.experiments}
          branches={$jobStore.branches}
          totalExperiments={$jobStore.totalExperiments}
          on:back={() => studioStore.setPhase('complete')}
          on:published={(e) => {
            studioStore.confirmPublished(e.detail.modelId);
            router.navigate('model-detail', { modelId: e.detail.modelId });
          }}
          on:newResearch={() => {
            studioStore.reset();
            topicInput = '';
          }}
        />
      </div>

    {:else}
      <!-- Fallback: redirect to idle -->
      <div class="studio-header">
        <button class="sh-back" on:click={goBackToIdle}>← Studio</button>
        <h1 class="sh-title">Magnet Studio</h1>
      </div>
    {/if}

  </div>
</div>

<!-- Research Start Confirmation Modal -->
<ContractCallModal
  {modalCall}
  {modalOpen}
  {modalStep}
  walletConnected={$wallet.connected}
  walletAddress={$wallet.address}
  on:close={handleModalClose}
  on:confirm={handleModalConfirm}
  on:connectWallet={() => {
    modalOpen = false;
    toasts.warning('Wallet Required', 'Please connect your wallet to start research');
  }}
/>

<!-- Credit Insufficient Modal -->
<CreditInsufficientModal
  open={creditModalOpen}
  required={creditRequired}
  available={creditAvailable}
  on:close={() => creditModalOpen = false}
  on:buyCredits={() => {
    creditModalOpen = false;
    nav('protocol');
    toasts.info('Top Up Credits', 'You can purchase credits on the Protocol page');
  }}
/>

<!-- GPU Onboard Wizard -->
{#if gpuWizardOpen}
  <GPUOnboardWizard
    on:close={() => gpuWizardOpen = false}
    on:complete={(e) => {
      gpuWizardOpen = false;
      toasts.success('GPU Registered', `${e.detail.nodeId} registered`);
    }}
  />
{/if}

<style>
  .studio-page {
    opacity: 0;
    transition: opacity var(--dur-slow, 600ms) ease;
    -webkit-font-smoothing: antialiased;
    background: var(--page-bg, #FAF9F7);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .studio-page.mounted { opacity: 1; }

  .studio-content {
    flex: 1;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    padding: 24px 20px 100px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ═══════ HEADER ═══════ */
  .studio-header, .create-header { padding: 4px 0 8px; }
  .sh-back {
    appearance: none; border: none; background: none;
    color: var(--text-muted, #9a9590);
    font-size: 0.66rem; font-weight: 600;
    cursor: pointer; padding: 0; margin-bottom: 8px; display: block;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    transition: color 150ms;
  }
  .sh-back:hover { color: var(--accent, #D97757); }
  .sh-title-row { display: flex; align-items: center; gap: 8px; color: var(--accent, #D97757); }
  .sh-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.5rem; font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0; letter-spacing: -0.02em;
  }
  .sh-sub {
    font-size: 0.7rem; color: var(--text-muted, #9a9590); margin: 4px 0 0;
  }

  /* ═══════ STATS ROW ═══════ */
  .stats-row {
    display: flex; align-items: center; justify-content: center; gap: 0;
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px; padding: 12px 0;
  }
  .stat-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  }
  .stat-val {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 1.1rem; font-weight: 700; color: var(--text-primary, #2D2D2D);
  }
  .stat-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.5rem; font-weight: 600; color: var(--text-muted, #9a9590);
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .stat-divider { width: 1px; height: 28px; background: var(--border-subtle, #EDEAE5); }

  /* ═══════ CTA: NEW RESEARCH ═══════ */
  .cta-new-research {
    appearance: none; width: 100%;
    border: 1px solid rgba(217, 119, 87, 0.25);
    background: linear-gradient(135deg, rgba(217, 119, 87, 0.06) 0%, rgba(217, 119, 87, 0.02) 100%);
    border-radius: 14px; padding: 16px 18px;
    cursor: pointer; transition: all 200ms ease;
    display: flex; align-items: center; justify-content: space-between;
    text-align: left; font-family: var(--font-body, 'Inter', sans-serif);
  }
  .cta-new-research:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 4px 20px rgba(217, 119, 87, 0.12);
    transform: translateY(-1px);
  }
  .cta-left { display: flex; align-items: center; gap: 12px; color: var(--accent, #D97757); }
  .cta-text { display: flex; flex-direction: column; gap: 2px; }
  .cta-text strong { font-size: 0.88rem; color: var(--text-primary, #2D2D2D); }
  .cta-text span { font-size: 0.64rem; color: var(--text-muted, #9a9590); }
  .cta-arrow {
    font-size: 1.1rem; color: var(--accent, #D97757);
    transition: transform 150ms;
  }
  .cta-new-research:hover .cta-arrow { transform: translateX(3px); }

  /* ═══════ SECTION BLOCKS ═══════ */
  .section-block { display: flex; flex-direction: column; gap: 8px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; }
  .section-action {
    appearance: none; border: none; background: none;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem; font-weight: 600;
    color: var(--accent, #D97757); cursor: pointer;
    transition: opacity 150ms;
  }
  .section-action:hover { opacity: 0.7; }

  /* ═══════ JOBS LIST ═══════ */
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .jobs-list {
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px; overflow: hidden;
  }
  .job-row {
    appearance: none; border: none; background: transparent;
    width: 100%; padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; transition: background 150ms;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    font-family: var(--font-body, 'Inter', sans-serif); text-align: left;
  }
  .job-row:last-child { border-bottom: none; }
  .job-row:hover { background: rgba(217, 119, 87, 0.03); }
  .job-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .job-status {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--text-muted, #9a9590); flex-shrink: 0;
  }
  .job-status--running {
    background: var(--accent, #D97757);
    animation: pulse 1.5s ease infinite;
  }
  .job-status--done { background: #27864a; }
  .job-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
  .job-topic {
    font-size: 0.78rem; font-weight: 600; color: var(--text-primary, #2D2D2D);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .job-progress-wrap { display: flex; align-items: center; gap: 8px; }
  .job-progress { flex: 1; height: 3px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden; }
  .job-progress-bar { height: 100%; background: var(--accent, #D97757); border-radius: 2px; transition: width 400ms ease; }
  .job-pct {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; font-weight: 600; color: var(--text-muted, #9a9590);
    flex-shrink: 0; min-width: 24px;
  }
  .job-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: 12px; }
  .job-metric {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.6rem; font-weight: 600; color: var(--text-primary, #2D2D2D);
  }
  .job-arrow { font-size: 0.8rem; color: var(--text-muted, #9a9590); transition: transform 150ms; }
  .job-row:hover .job-arrow { transform: translateX(3px); color: var(--accent, #D97757); }

  /* ═══════ MODELS GRID ═══════ */
  .models-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .model-card {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff); border-radius: 12px;
    padding: 12px 14px; cursor: pointer; text-align: left;
    display: flex; flex-direction: column; gap: 4px;
    transition: all 180ms; font-family: var(--font-body, 'Inter', sans-serif);
  }
  .model-card:hover {
    border-color: var(--accent, #D97757);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .model-card-top { display: flex; align-items: center; justify-content: space-between; color: var(--text-muted, #9a9590); }
  .model-state {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.46rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 2px 6px; border-radius: 100px;
    color: var(--text-muted, #9a9590); background: rgba(0,0,0,0.04);
  }
  .model-state--active { color: #27864a; background: rgba(39, 134, 74, 0.08); }
  .model-card-name {
    font-size: 0.72rem; font-weight: 600; color: var(--text-primary, #2D2D2D);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .model-card-meta {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.5rem; color: var(--text-muted, #9a9590);
  }

  /* ═══════ EMPTY STATE ═══════ */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 28px 16px;
    background: var(--surface, #fff);
    border: 1px dashed var(--border-subtle, #EDEAE5);
    border-radius: 12px; color: var(--text-muted, #9a9590);
  }
  .empty-text { font-size: 0.78rem; font-weight: 600; color: var(--text-primary, #2D2D2D); }
  .empty-sub { font-size: 0.6rem; color: var(--text-muted, #9a9590); }

  /* ═══════ QUICK LINKS ═══════ */
  .quick-links { display: flex; gap: 8px; flex-wrap: wrap; }
  .quick-link {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff); border-radius: 10px;
    padding: 8px 14px; cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-body, 'Inter', sans-serif);
    font-size: 0.66rem; font-weight: 500; color: var(--text-muted, #9a9590);
    transition: all 150ms;
  }
  .quick-link:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }

  /* ═══════ PRESET SECTION ═══════ */
  .preset-section { display: flex; flex-direction: column; gap: 8px; }
  .preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .preset-card {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff); border-radius: 14px;
    padding: 14px 16px; cursor: pointer; text-align: left;
    display: flex; flex-direction: column; gap: 6px;
    transition: all 220ms ease; font-family: var(--font-body, 'Inter', sans-serif);
  }
  .preset-card:hover {
    border-color: var(--accent, #D97757);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(217, 119, 87, 0.08);
  }
  .preset-card-top { display: flex; align-items: center; justify-content: space-between; }
  .preset-icon { font-size: 1.2rem; line-height: 1; }
  .preset-difficulty {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.48rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 2px 7px; border-radius: 100px;
  }
  .preset-difficulty--beginner { color: #27864a; background: rgba(39, 134, 74, 0.08); }
  .preset-difficulty--intermediate { color: #d4a017; background: rgba(212, 160, 23, 0.08); }
  .preset-difficulty--advanced { color: var(--accent, #D97757); background: rgba(217, 119, 87, 0.08); }
  .preset-name { font-size: 0.74rem; font-weight: 600; color: var(--text-primary, #2D2D2D); line-height: 1.3; }
  .preset-desc { font-size: 0.58rem; color: var(--text-muted, #9a9590); line-height: 1.45; }
  .preset-card-footer {
    display: flex; align-items: center; gap: 6px; margin-top: 2px;
    padding-top: 8px; border-top: 1px solid var(--border-subtle, #EDEAE5);
  }
  .preset-time {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.5rem; font-weight: 600; color: var(--text-muted, #9a9590);
    flex-shrink: 0;
  }
  .preset-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-left: auto; }
  .preset-tag {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.46rem; font-weight: 500; color: var(--text-muted, #9a9590);
    background: var(--page-bg, #FAF9F7); padding: 1px 6px; border-radius: 4px;
    border: 1px solid var(--border-subtle, #EDEAE5);
  }

  /* ═══════ STEP INDICATOR ═══════ */
  .step-indicator {
    display: flex; align-items: center; gap: 0; margin-bottom: 8px;
  }
  .step-dot {
    width: 8px; height: 8px; border-radius: 50%;
    border: 1.5px solid var(--border-subtle, #EDEAE5);
    background: transparent; transition: all 250ms ease;
    flex-shrink: 0;
  }
  .step-dot--active {
    border-color: var(--accent, #D97757);
    background: var(--accent, #D97757);
  }
  .step-dot--done {
    border-color: #27864a;
    background: #27864a;
  }
  .step-line {
    width: 32px; height: 1.5px;
    background: var(--border-subtle, #EDEAE5);
    transition: background 250ms ease;
  }
  .step-line--active { background: var(--accent, #D97757); }
  .step-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; font-weight: 600;
    color: var(--accent, #D97757);
    letter-spacing: 0.04em; margin-bottom: 4px;
  }

  /* ═══════ SECTION LABELS ═══════ */
  .section-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem; font-weight: 700;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase; letter-spacing: 0.06em;
    margin: 0; padding-left: 2px;
  }

  /* ═══════ CREATE STATE ═══════ */
  .create-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.6rem; font-weight: 700;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase; letter-spacing: 0.06em;
    display: block; margin-bottom: 6px;
  }
  .create-input-wrap {
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px; background: var(--surface, #fff);
    padding: 2px; transition: border-color 200ms;
  }
  .create-input-wrap:focus-within { border-color: var(--accent, #D97757); }
  .create-input {
    width: 100%; appearance: none; border: none; background: transparent;
    color: var(--text-primary, #2D2D2D); font-size: 0.9rem; padding: 12px 14px;
    outline: none; font-family: var(--font-body, 'Inter', sans-serif);
  }
  .create-input::placeholder { color: var(--text-muted, #9a9590); }

  /* AI Recommendation Panel */
  .ai-rec-panel {
    background: var(--surface, #fff);
    border: 1px solid rgba(217, 119, 87, 0.2);
    border-radius: 14px; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .ai-rec-header { display: flex; align-items: center; gap: 8px; }
  .ai-rec-icon {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; font-weight: 700;
    color: var(--accent, #D97757); background: rgba(217, 119, 87, 0.1);
    padding: 3px 8px; border-radius: 6px; letter-spacing: 0.06em;
  }
  .ai-rec-title { font-size: 0.78rem; font-weight: 600; color: var(--text-primary, #2D2D2D); }

  .preset-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .preset-chip {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: transparent; color: var(--text-muted, #9a9590);
    font-size: 0.6rem; font-weight: 500; padding: 4px 12px; border-radius: 100px;
    cursor: pointer; transition: all 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .preset-chip:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }
  .preset-chip--active {
    border-color: var(--accent, #D97757); color: #fff;
    background: var(--accent, #D97757);
  }

  .ai-rec-preview {
    display: flex; flex-direction: column; gap: 4px;
    padding: 8px 10px; background: var(--page-bg, #FAF9F7);
    border-radius: 8px;
  }
  .ai-rec-row { display: flex; align-items: center; gap: 8px; }
  .ai-rec-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.54rem; font-weight: 600; color: var(--text-muted, #9a9590);
    min-width: 60px;
  }
  .ai-rec-val { font-size: 0.66rem; color: var(--text-primary, #2D2D2D); }

  .resource-section { display: flex; flex-direction: column; gap: 6px; }
  .resource-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.54rem; font-weight: 700; color: var(--text-muted, #9a9590);
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .resource-modes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .rm-btn {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--page-bg, #FAF9F7); border-radius: 8px;
    padding: 8px 6px; cursor: pointer; transition: all 150ms;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .rm-btn:hover { border-color: var(--accent, #D97757); }
  .rm-btn--active {
    border-color: var(--accent, #D97757);
    background: rgba(217, 119, 87, 0.06);
  }
  .rm-name { font-size: 0.66rem; font-weight: 600; color: var(--text-primary, #2D2D2D); }
  .rm-desc { font-size: 0.5rem; color: var(--text-muted, #9a9590); }

  /* Create Actions */
  .create-actions { display: flex; gap: 10px; margin-top: 8px; }
  .create-btn {
    appearance: none; border: none; border-radius: 10px;
    padding: 10px 20px; font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .create-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .create-btn--primary {
    background: var(--accent, #D97757); color: #fff; flex: 1;
  }
  .create-btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--accent, #D97757) 85%, #000); }
  .create-btn--secondary {
    background: transparent; color: var(--text-muted, #9a9590);
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .create-btn--secondary:hover:not(:disabled) { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }

  /* ═══════ COMPLETE STATE ═══════ */
  .complete-section { display: flex; flex-direction: column; gap: 14px; }
  .complete-summary {
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 12px; padding: 14px 16px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .cs-row { display: flex; align-items: center; gap: 8px; }
  .cs-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem; font-weight: 600; color: var(--text-muted, #9a9590);
    min-width: 50px;
  }
  .cs-val { font-size: 0.74rem; color: var(--text-primary, #2D2D2D); }
  .cs-val--done { color: #27ae60; font-weight: 600; }

  .complete-actions { display: flex; flex-direction: column; gap: 8px; }
  .ca-btn {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff); border-radius: 12px;
    padding: 14px 16px; cursor: pointer;
    display: flex; align-items: center; gap: 12px;
    transition: all 180ms; text-align: left;
    font-family: var(--font-body, 'Inter', sans-serif); width: 100%;
  }
  .ca-btn:hover {
    border-color: var(--accent, #D97757);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .ca-icon { font-size: 1.2rem; }
  .ca-text { display: flex; flex-direction: column; gap: 2px; }
  .ca-text strong { font-size: 0.82rem; color: var(--text-primary, #2D2D2D); }
  .ca-text small { font-size: 0.62rem; color: var(--text-muted, #9a9590); }
  .ca-btn--deploy { border-color: rgba(217, 119, 87, 0.3); background: rgba(217, 119, 87, 0.03); }
  .ca-btn--deploy:hover { border-color: var(--accent, #D97757); }


  /* ═══════ PUBLISH STATE ═══════ */
  .publish-section { display: flex; flex-direction: column; gap: 14px; }

  @media (max-width: 600px) {
    .studio-content { padding: 12px 12px 88px; gap: 10px; }
    .sh-title { font-size: 1.2rem; }
    .running-hero { padding: 10px 14px; flex-direction: column; align-items: stretch; gap: 8px; }
    .quick-tiles { grid-template-columns: repeat(2, 1fr); }
    .resource-modes { grid-template-columns: repeat(2, 1fr); }
    .create-actions { flex-direction: column; }
  }
</style>
