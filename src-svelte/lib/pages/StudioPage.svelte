<script lang="ts">
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { router } from "../stores/router.ts";
  import PixelIcon from "../components/PixelIcon.svelte";

  let topicInput = '';

  onMount(() => {
    dashboardStore.init();
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

  function startResearch() {
    const topic = topicInput.trim();
    if (!topic) return;
    dashboardStore.startResearch(topic);
    topicInput = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      startResearch();
    }
  }
</script>

<div class="studio-page" class:mounted={ds.mounted}>
  <div class="studio-content">
    <!-- Header -->
    <div class="studio-header" in:fade={{ duration: 300 }}>
      <button class="sh-back" on:click={() => nav('dashboard')}>← HOOT</button>
      <h1 class="sh-title">Magnet Studio</h1>
      <p class="sh-sub">AI 자율 연구 · 모델 학습 · 배포</p>
    </div>

    <!-- LIVE Research (if running) -->
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
          <button class="fc-hint" on:click={() => { topicInput = s; }}>{s}</button>
        {/each}
      </div>
    </div>

    <!-- Models Card -->
    <button class="flow-card flow-card--models" on:click={() => nav('models')}>
      <div class="fc-header">
        <PixelIcon type="grid" size={18} />
        <span class="fc-title">Models</span>
        <span class="fc-badge fc-badge--blue">{ds.modelsSummary.count} models</span>
      </div>
      <p class="fc-desc">연구로 학습된 모델 확인 · 배포 · 공유</p>
      <span class="fc-action">모델 허브 →</span>
    </button>

    <!-- Research History / Activity -->
    {#if ds.events.length > 0}
      <div class="activity-section">
        <h3 class="section-label">연구 활동</h3>
        <div class="activity-list">
          {#each ds.events.filter(e => e.type === 'research' || e.type === 'model').slice(0, 5) as event}
            <div class="activity-row">
              <span class="activity-dot" class:activity-dot--research={event.type === 'research'}
                class:activity-dot--model={event.type === 'model'}></span>
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
  .studio-header { padding: 4px 0 8px; }
  .sh-back {
    appearance: none;
    border: none;
    background: none;
    color: var(--text-muted, #9a9590);
    font-size: 0.66rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-bottom: 8px;
    display: block;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    transition: color 150ms;
  }
  .sh-back:hover { color: var(--accent, #D97757); }

  .sh-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0;
    letter-spacing: -0.02em;
  }
  .sh-sub {
    font-size: 0.7rem;
    color: var(--text-muted, #9a9590);
    margin: 4px 0 0;
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

  /* ═══════ FLOW CARDS ═══════ */
  .flow-card {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--surface, #fff);
    border-radius: 14px;
    padding: 16px 18px;
    text-align: left;
    cursor: pointer;
    transition: all 180ms ease;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    font-family: var(--font-body, 'Inter', sans-serif);
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
  .flow-card--research:hover {
    transform: none;
    border-color: rgba(217, 119, 87, 0.2);
    box-shadow: none;
  }

  .fc-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted, #9a9590);
  }
  .fc-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
  }
  .fc-badge {
    margin-left: auto;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.52rem;
    font-weight: 600;
    color: var(--accent, #D97757);
    background: rgba(217, 119, 87, 0.08);
    padding: 2px 8px;
    border-radius: 100px;
  }
  .fc-badge--blue { color: #2980b9; background: rgba(41, 128, 185, 0.08); }

  .fc-desc {
    font-size: 0.72rem;
    color: var(--text-muted, #9a9590);
    line-height: 1.5;
    margin: 0;
  }
  .fc-action {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accent, #D97757);
    margin-top: 2px;
  }

  /* Research input */
  .fc-form {
    display: flex;
    align-items: center;
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: 10px;
    padding: 2px 2px 2px 12px;
    margin-top: 4px;
    transition: border-color 200ms;
  }
  .fc-form:focus-within { border-color: var(--accent, #D97757); }
  .fc-input {
    flex: 1;
    appearance: none; border: none; background: transparent;
    color: var(--text-primary, #2D2D2D);
    font-size: 0.78rem;
    padding: 8px 0;
    outline: none;
    font-family: var(--font-body, 'Inter', sans-serif);
    min-width: 0;
  }
  .fc-input::placeholder { color: var(--text-muted, #9a9590); font-size: 0.74rem; }
  .fc-go {
    appearance: none; border: none;
    background: var(--accent, #D97757);
    color: #fff;
    font-size: 0.72rem; font-weight: 600;
    padding: 7px 14px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .fc-go:hover { background: color-mix(in srgb, var(--accent, #D97757) 85%, #000); }

  .fc-hints { display: flex; gap: 5px; margin-top: 4px; }
  .fc-hint {
    appearance: none;
    border: 1px solid var(--border-subtle, #EDEAE5);
    background: transparent;
    color: var(--text-muted, #9a9590);
    font-size: 0.6rem;
    padding: 3px 10px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .fc-hint:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }

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
    .studio-content { padding: 12px 12px 88px; gap: 10px; }
    .sh-title { font-size: 1.2rem; }
    .running-hero { padding: 10px 14px; flex-direction: column; align-items: stretch; gap: 8px; }
  }
</style>
