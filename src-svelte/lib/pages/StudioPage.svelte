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
  import { ONTOLOGY_PRESETS } from "../data/ontologyData.ts";
  import type { ContractCall } from "../data/protocolData.ts";
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
      title: 'Research Job 생성',
      contract: '0x7a3f…ResearchRegistry',
      fn: 'createResearchJob',
      params: [
        { name: 'topic', type: 'string', value: topic },
        { name: 'resourceMode', type: 'uint8', value: stState.resourceMode },
        { name: 'maxExperiments', type: 'uint32', value: '60' },
      ],
      fee: `${creditRequired} HOOT`,
      gas: '~0.0008 ETH',
      note: 'AI가 자동으로 실험을 구성하고 최적의 모델을 탐색합니다. 실험 수와 비용은 예상치입니다.',
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
      toasts.tx('Research Job 생성됨', txHash, `${pendingTopic} 연구가 시작됩니다`);
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
    { id: 'demo', label: 'Demo', desc: '로컬 시뮬레이션' },
    { id: 'local', label: 'Local', desc: '로컬 GPU' },
    { id: 'network', label: 'Network', desc: 'HOOT 메시' },
    { id: 'hybrid', label: 'Hybrid', desc: '로컬 + 네트워크' },
  ];
</script>

<div class="studio-page" class:mounted={ds.mounted}>
  <div class="studio-content">

    {#if phase === 'idle'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- IDLE STATE: Dashboard-style landing                  -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="studio-header" in:fade={{ duration: 300 }}>
        <button class="sh-back" on:click={() => nav('dashboard')}>← HOOT</button>
        <h1 class="sh-title">Magnet Studio</h1>
        <p class="sh-sub">AI 자율 연구 · 모델 학습 · 배포</p>
      </div>

      <!-- LIVE Research Hero -->
      {#if heroJob}
        <button class="running-hero" on:click={() => nav('research')} in:fly={{ y: 10, duration: 220 }}>
          <div class="rh-left">
            <div class="rh-badge"><span class="rh-dot"></span>LIVE</div>
            <span class="rh-topic">{heroJob.topic}</span>
          </div>
          <div class="rh-right">
            <div class="rh-progress"><div class="rh-progress-bar" style="width: {heroProgress}%"></div></div>
            <div class="rh-meta">
              <span>{heroProgress}%</span>
              <span>{heroJob.metrics?.bestMetric?.toFixed(4) ?? '—'} best</span>
              <span class="rh-goto">보기 →</span>
            </div>
          </div>
        </button>
      {/if}

      <!-- Research Card -->
      <div class="flow-card flow-card--research">
        <div class="fc-header">
          <PixelIcon type="research" size={18} />
          <span class="fc-title">Research</span>
          {#if ds.researchSummary.runningJobs > 0}
            <span class="fc-badge">{ds.researchSummary.runningJobs} running</span>
          {/if}
        </div>
        <p class="fc-desc">주제를 입력하면 AI가 자동으로 실험하고 최적의 모델을 찾아드립니다</p>
        <form class="fc-form" on:submit|preventDefault={startResearch}>
          <input
            bind:value={topicInput}
            on:keydown={handleKeydown}
            class="fc-input"
            placeholder="연구 주제 입력... (예: BTC price prediction)"
            autocomplete="off"
            spellcheck="false"
          />
          {#if topicInput.trim()}
            <button class="fc-go" type="submit">시작 →</button>
          {/if}
        </form>
        <div class="fc-hints">
          {#each ds.topicSuggestions.slice(0, 3) as s}
            <button class="fc-hint" on:click={() => goToCreate(s)}>{s}</button>
          {/each}
        </div>
        <button class="fc-advanced" on:click={() => nav('ontology')}>고급 설정 →</button>
        {#if !$nodeStore.hasActiveNode}
          <button class="fc-advanced" on:click={() => gpuWizardOpen = true}>GPU 노드 등록 →</button>
        {/if}
      </div>

      <!-- Research Presets -->
      <div class="preset-section">
        <h3 class="section-label">추천 연구 주제</h3>
        <div class="preset-grid">
          {#each presets as p}
            <button class="preset-card" on:click={() => goToCreate(p.name)}>
              <span class="preset-name">{p.name}</span>
              <span class="preset-desc">{p.description ?? ''}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Recent Research Only (not all events) -->
      {#if ds.events.filter(e => e.type === 'research').length > 0}
        <div class="activity-section">
          <h3 class="section-label">최근 연구</h3>
          <div class="activity-list">
            {#each ds.events.filter(e => e.type === 'research').slice(0, 4) as event}
              <button class="activity-row activity-row--clickable" on:click={() => nav('research')}>
                <span class="activity-dot activity-dot--research"></span>
                <span class="activity-text">{event.message}</span>
                <span class="activity-goto">보기 →</span>
                <span class="activity-time">{new Date(event.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

    {:else if phase === 'step1' || phase === 'step2'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CREATE STATE: Topic input + AI recommendation       -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="create-header" in:fly={{ y: -10, duration: 200 }}>
        <button class="sh-back" on:click={goBackToIdle}>← Studio</button>
        <h1 class="sh-title">새 연구 시작</h1>
        <p class="sh-sub">주제를 입력하고 연구를 구성하세요</p>
      </div>

      <div class="create-input-section" in:fly={{ y: 10, duration: 250, delay: 50 }}>
        <label class="create-label">연구 주제</label>
        <div class="create-input-wrap">
          <input
            bind:value={topicInput}
            on:keydown={handleKeydown}
            class="create-input"
            placeholder="예: Bitcoin price prediction, Protein folding, ..."
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
            <span class="ai-rec-title">추천 구성</span>
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
              <span class="ai-rec-label">브랜치</span>
              <span class="ai-rec-val">Architecture, Optimization, Data, Evaluation</span>
            </div>
            <div class="ai-rec-row">
              <span class="ai-rec-label">실험 수</span>
              <span class="ai-rec-val">~60 experiments</span>
            </div>
            <div class="ai-rec-row">
              <span class="ai-rec-label">예상 비용</span>
              <span class="ai-rec-val">~12.5 HOOT</span>
            </div>
            <div class="ai-rec-row">
              <span class="ai-rec-label">메트릭</span>
              <span class="ai-rec-val">val_bpb (lower is better)</span>
            </div>
          </div>

          <!-- Resource Mode -->
          <div class="resource-section">
            <span class="resource-label">리소스 모드</span>
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
          연구 시작 →
        </button>
        <button
          class="create-btn create-btn--secondary"
          disabled={topicInput.trim().length < 2}
          on:click={handleAdvancedSetup}
        >
          고급 설정
        </button>
      </div>

    {:else if phase === 'setup'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- SETUP STATE: Advanced ontology configuration         -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="setup-section" in:fly={{ y: 10, duration: 300 }}>
        <button class="sh-back" on:click={() => studioStore.goBack()}>← 돌아가기</button>
        <h1 class="sh-title">고급 설정</h1>
        <p class="sh-sub">실험 브랜치, 모델, 파라미터를 직접 구성하세요</p>
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
        <h1 class="sh-title">연구 완료</h1>
        <p class="sh-sub">{stState.createTopic || '연구'} 완료</p>

        <div class="complete-summary">
          <div class="cs-row"><span class="cs-label">주제</span><span class="cs-val">{stState.createTopic}</span></div>
          <div class="cs-row"><span class="cs-label">상태</span><span class="cs-val cs-val--done">Complete</span></div>
        </div>

        <div class="complete-actions">
          <button class="ca-btn ca-btn--deploy" on:click={() => {
            studioStore.goToPublish();
          }}>
            <span class="ca-icon">🚀</span>
            <span class="ca-text">
              <strong>Deploy</strong>
              <small>모델 배포 및 민팅</small>
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
              <small>같은 설정으로 재학습</small>
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
              <small>개선된 설정으로 재연구</small>
            </span>
          </button>
        </div>

        <button class="create-btn create-btn--secondary" style="margin-top: 12px;" on:click={() => nav('research')}>
          연구 결과 상세 보기 →
        </button>
      </div>

    {:else if phase === 'publish'}
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- PUBLISH STATE: Model mint wizard                     -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="publish-section" in:fly={{ y: 10, duration: 300 }}>
        <button class="sh-back" on:click={() => studioStore.setPhase('complete')}>← 결과로 돌아가기</button>
        <h1 class="sh-title">모델 배포</h1>
        <p class="sh-sub">연구 결과를 HOOT 네트워크에 배포합니다</p>
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
    toasts.warning('지갑 연결 필요', '연구를 시작하려면 먼저 지갑을 연결하세요');
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
    toasts.info('크레딧 충전', 'Protocol 페이지에서 크레딧을 충전할 수 있습니다');
  }}
/>

<!-- GPU Onboard Wizard -->
{#if gpuWizardOpen}
  <GPUOnboardWizard
    on:close={() => gpuWizardOpen = false}
    on:complete={(e) => {
      gpuWizardOpen = false;
      toasts.success('GPU 등록 완료', `${e.detail.nodeId} 등록됨`);
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
  .sh-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.5rem; font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0; letter-spacing: -0.02em;
  }
  .sh-sub {
    font-size: 0.7rem; color: var(--text-muted, #9a9590); margin: 4px 0 0;
  }

  /* ═══════ RUNNING HERO ═══════ */
  .running-hero {
    appearance: none;
    border: 1px solid rgba(217, 119, 87, 0.25);
    background: linear-gradient(135deg, rgba(217, 119, 87, 0.06) 0%, rgba(217, 119, 87, 0.02) 100%);
    border-radius: 14px; padding: 14px 18px;
    cursor: pointer; transition: all 180ms ease;
    display: flex; align-items: center; gap: 16px;
    width: 100%; text-align: left;
  }
  .running-hero:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 2px 16px rgba(217, 119, 87, 0.12);
  }
  .rh-left { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .rh-badge {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; font-weight: 700; letter-spacing: 0.08em;
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

  /* ═══════ FLOW CARDS ═══════ */
  .flow-card {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff);
    border-radius: 14px; padding: 16px 18px;
    text-align: left; cursor: pointer;
    transition: all 180ms ease;
    display: flex; flex-direction: column; gap: 6px;
    width: 100%; font-family: var(--font-body, 'Inter', sans-serif);
  }
  .flow-card:hover {
    border-color: var(--accent, #D97757);
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    transform: translateY(-1px);
  }
  .flow-card--research {
    cursor: default;
    border-color: rgba(217, 119, 87, 0.2);
    background: linear-gradient(135deg, rgba(217, 119, 87, 0.03) 0%, var(--surface, #fff) 100%);
  }
  .flow-card--research:hover { transform: none; border-color: rgba(217, 119, 87, 0.2); box-shadow: none; }

  .fc-header { display: flex; align-items: center; gap: 8px; color: var(--text-muted, #9a9590); }
  .fc-title { font-size: 0.82rem; font-weight: 700; color: var(--text-primary, #2D2D2D); }
  .fc-badge {
    margin-left: auto;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; font-weight: 600;
    color: var(--accent, #D97757); background: rgba(217, 119, 87, 0.08);
    padding: 2px 8px; border-radius: 100px;
  }
  .fc-badge--blue { color: #2980b9; background: rgba(41, 128, 185, 0.08); }
  .fc-desc { font-size: 0.72rem; color: var(--text-muted, #9a9590); line-height: 1.5; margin: 0; }
  .fc-action { font-size: 0.7rem; font-weight: 600; color: var(--accent, #D97757); margin-top: 2px; }

  .fc-form {
    display: flex; align-items: center;
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 10px; padding: 2px 2px 2px 12px;
    margin-top: 4px; transition: border-color 200ms;
  }
  .fc-form:focus-within { border-color: var(--accent, #D97757); }
  .fc-input {
    flex: 1; appearance: none; border: none; background: transparent;
    color: var(--text-primary, #2D2D2D); font-size: 0.78rem; padding: 8px 0;
    outline: none; font-family: var(--font-body, 'Inter', sans-serif); min-width: 0;
  }
  .fc-input::placeholder { color: var(--text-muted, #9a9590); font-size: 0.74rem; }
  .fc-go {
    appearance: none; border: none;
    background: var(--accent, #D97757); color: #fff;
    font-size: 0.72rem; font-weight: 600;
    padding: 7px 14px; border-radius: 8px;
    cursor: pointer; white-space: nowrap;
    transition: background 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .fc-go:hover { background: color-mix(in srgb, var(--accent, #D97757) 85%, #000); }

  .fc-hints { display: flex; gap: 5px; margin-top: 4px; }
  .fc-hint {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: transparent; color: var(--text-muted, #9a9590);
    font-size: 0.6rem; padding: 3px 10px; border-radius: 100px;
    cursor: pointer; transition: all 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .fc-hint:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }

  .fc-advanced {
    appearance: none; border: none; background: none;
    color: var(--text-muted, #9a9590); font-size: 0.66rem; font-weight: 600;
    cursor: pointer; padding: 2px 0; margin-top: 2px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    transition: color 150ms; text-align: left;
  }
  .fc-advanced:hover { color: var(--accent, #D97757); }

  /* ═══════ PRESET SECTION ═══════ */
  .preset-section { display: flex; flex-direction: column; gap: 8px; }
  .preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .preset-card {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff); border-radius: 10px;
    padding: 12px 14px; cursor: pointer; text-align: left;
    display: flex; flex-direction: column; gap: 3px;
    transition: all 180ms; font-family: var(--font-body, 'Inter', sans-serif);
  }
  .preset-card:hover {
    border-color: var(--accent, #D97757);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .preset-name { font-size: 0.72rem; font-weight: 600; color: var(--text-primary, #2D2D2D); }
  .preset-desc { font-size: 0.58rem; color: var(--text-muted, #9a9590); line-height: 1.4; }

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
    padding: 8px 14px; width: 100%;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    appearance: none; border-left: none; border-right: none; border-top: none;
    background: transparent; cursor: pointer; transition: background 150ms;
    font-family: var(--font-body, 'Inter', sans-serif); text-align: left;
  }
  .activity-row:last-child { border-bottom: none; }
  .activity-row--clickable:hover { background: rgba(217, 119, 87, 0.04); }
  .activity-goto {
    font-size: 0.58rem; font-weight: 600; color: var(--accent, #D97757);
    opacity: 0; transition: opacity 150ms; flex-shrink: 0;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .activity-row--clickable:hover .activity-goto { opacity: 1; }
  .activity-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-muted, #9a9590); flex-shrink: 0; }
  .activity-dot--research { background: var(--accent, #D97757); }
  .activity-dot--model { background: #2980b9; }
  .activity-text {
    flex: 1; font-size: 0.72rem; color: var(--text-primary, #2D2D2D);
    min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .activity-time {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem; color: var(--text-muted, #9a9590); flex-shrink: 0;
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
