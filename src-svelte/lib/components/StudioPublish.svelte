<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  export let topic: string = '';

  const dispatch = createEventDispatcher<{
    back: void;
    published: { modelId: string };
  }>();

  type WizardStep = 'review' | 'pending' | 'confirmed';
  let step: WizardStep = 'review';
  let modelName = topic ? topic.replace(/\s+/g, '-').toLowerCase() : 'my-model';
  let modelSlug = `hoot/${modelName}`;
  let pendingTimer: ReturnType<typeof setTimeout>;

  // Simulated contract data
  const contractAddr = '0x7a3f…8e2d';
  const gasFee = '0.0012 ETH';
  const mintFee = '2.5 HOOT';

  function confirmPublish() {
    step = 'pending';
    pendingTimer = setTimeout(() => {
      step = 'confirmed';
    }, 2200);
  }

  function handleDone() {
    const modelId = `model-${modelName}-${Date.now().toString(36)}`;
    dispatch('published', { modelId });
  }

  function handleBack() {
    if (step === 'review') {
      dispatch('back');
    } else if (step === 'pending') {
      clearTimeout(pendingTimer);
      step = 'review';
    }
  }
</script>

<div class="publish-wizard">
  <!-- Step Indicator -->
  <div class="pw-steps">
    <div class="pw-step" class:pw-step--active={step === 'review'} class:pw-step--done={step !== 'review'}>
      <span class="pw-step-num">1</span>
      <span class="pw-step-label">Review</span>
    </div>
    <div class="pw-step-line" class:pw-step-line--active={step !== 'review'}></div>
    <div class="pw-step" class:pw-step--active={step === 'pending'} class:pw-step--done={step === 'confirmed'}>
      <span class="pw-step-num">2</span>
      <span class="pw-step-label">Confirm</span>
    </div>
    <div class="pw-step-line" class:pw-step-line--active={step === 'confirmed'}></div>
    <div class="pw-step" class:pw-step--active={step === 'confirmed'}>
      <span class="pw-step-num">3</span>
      <span class="pw-step-label">Done</span>
    </div>
  </div>

  {#if step === 'review'}
    <div class="pw-body" in:fly={{ x: -20, duration: 200 }}>
      <h3 class="pw-section-title">모델 정보</h3>
      <div class="pw-field">
        <label class="pw-label">모델 이름</label>
        <input class="pw-input" bind:value={modelName} placeholder="my-model" />
      </div>
      <div class="pw-field">
        <label class="pw-label">Slug</label>
        <div class="pw-slug">{modelSlug}</div>
      </div>

      <h3 class="pw-section-title" style="margin-top: 16px;">컨트랙트 정보</h3>
      <div class="pw-contract">
        <div class="pw-row"><span class="pw-key">Contract</span><span class="pw-val">{contractAddr}</span></div>
        <div class="pw-row"><span class="pw-key">Function</span><span class="pw-val">mintModel()</span></div>
        <div class="pw-row"><span class="pw-key">Gas Fee</span><span class="pw-val">{gasFee}</span></div>
        <div class="pw-row"><span class="pw-key">Mint Fee</span><span class="pw-val">{mintFee}</span></div>
      </div>

      <div class="pw-actions">
        <button class="pw-btn pw-btn--secondary" on:click={handleBack}>← 돌아가기</button>
        <button class="pw-btn pw-btn--primary" on:click={confirmPublish}>배포 확인</button>
      </div>
    </div>

  {:else if step === 'pending'}
    <div class="pw-body pw-body--center" in:fade={{ duration: 200 }}>
      <div class="pw-spinner"></div>
      <p class="pw-pending-text">트랜잭션 처리 중...</p>
      <p class="pw-pending-sub">컨트랙트에 모델을 등록하고 있습니다</p>
      <button class="pw-cancel" on:click={handleBack}>취소</button>
    </div>

  {:else if step === 'confirmed'}
    <div class="pw-body pw-body--center" in:fly={{ y: 10, duration: 300 }}>
      <div class="pw-check">✓</div>
      <h3 class="pw-success-title">배포 완료!</h3>
      <p class="pw-success-sub">모델이 HOOT 네트워크에 등록되었습니다</p>
      <div class="pw-success-info">
        <div class="pw-row"><span class="pw-key">Model</span><span class="pw-val">{modelSlug}</span></div>
        <div class="pw-row"><span class="pw-key">Status</span><span class="pw-val pw-val--green">Published</span></div>
      </div>
      <button class="pw-btn pw-btn--primary" on:click={handleDone}>모델 상세 보기 →</button>
    </div>
  {/if}
</div>

<style>
  .publish-wizard {
    display: flex; flex-direction: column; gap: 20px;
  }

  /* Steps */
  .pw-steps { display: flex; align-items: center; gap: 0; justify-content: center; }
  .pw-step {
    display: flex; align-items: center; gap: 6px;
    opacity: 0.4; transition: opacity 200ms;
  }
  .pw-step--active, .pw-step--done { opacity: 1; }
  .pw-step-num {
    width: 22px; height: 22px; border-radius: 50%;
    border: 1.5px solid var(--text-muted, #9a9590);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem; font-weight: 700; color: var(--text-muted, #9a9590);
  }
  .pw-step--active .pw-step-num {
    border-color: var(--accent, #D97757); color: var(--accent, #D97757);
    background: rgba(217, 119, 87, 0.08);
  }
  .pw-step--done .pw-step-num {
    border-color: #27ae60; color: #27ae60; background: rgba(39, 174, 96, 0.08);
  }
  .pw-step-label {
    font-size: 0.62rem; font-weight: 600; color: var(--text-muted, #9a9590);
  }
  .pw-step--active .pw-step-label { color: var(--text-primary, #2D2D2D); }
  .pw-step-line {
    width: 32px; height: 1px; background: var(--border-subtle, #EDEAE5);
    margin: 0 8px; transition: background 200ms;
  }
  .pw-step-line--active { background: #27ae60; }

  /* Body */
  .pw-body { display: flex; flex-direction: column; gap: 12px; }
  .pw-body--center { align-items: center; padding: 20px 0; }

  .pw-section-title {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.56rem; font-weight: 700; color: var(--text-muted, #9a9590);
    text-transform: uppercase; letter-spacing: 0.06em; margin: 0;
  }

  .pw-field { display: flex; flex-direction: column; gap: 4px; }
  .pw-label {
    font-size: 0.6rem; font-weight: 600; color: var(--text-muted, #9a9590);
  }
  .pw-input {
    appearance: none; border: 1px solid var(--border-subtle, #EDEAE5);
    background: var(--page-bg, #FAF9F7); border-radius: 8px;
    padding: 8px 12px; font-size: 0.78rem; color: var(--text-primary, #2D2D2D);
    font-family: var(--font-body, 'Inter', sans-serif); outline: none;
    transition: border-color 200ms;
  }
  .pw-input:focus { border-color: var(--accent, #D97757); }
  .pw-slug {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.66rem; color: var(--text-muted, #9a9590);
    background: var(--page-bg, #FAF9F7); padding: 8px 12px;
    border-radius: 8px; border: 1px solid var(--border-subtle, #EDEAE5);
  }

  .pw-contract {
    background: var(--page-bg, #FAF9F7); border-radius: 8px;
    padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .pw-row { display: flex; align-items: center; gap: 8px; }
  .pw-key {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.54rem; font-weight: 600; color: var(--text-muted, #9a9590);
    min-width: 70px;
  }
  .pw-val { font-size: 0.68rem; color: var(--text-primary, #2D2D2D); }
  .pw-val--green { color: #27ae60; font-weight: 600; }

  .pw-actions { display: flex; gap: 10px; margin-top: 8px; }
  .pw-btn {
    appearance: none; border: none; border-radius: 10px;
    padding: 10px 20px; font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .pw-btn--primary { background: var(--accent, #D97757); color: #fff; flex: 1; }
  .pw-btn--primary:hover { background: color-mix(in srgb, var(--accent, #D97757) 85%, #000); }
  .pw-btn--secondary {
    background: transparent; color: var(--text-muted, #9a9590);
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .pw-btn--secondary:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }

  /* Pending */
  .pw-spinner {
    width: 36px; height: 36px; border-radius: 50%;
    border: 2.5px solid var(--border-subtle, #EDEAE5);
    border-top-color: var(--accent, #D97757);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .pw-pending-text { font-size: 0.84rem; font-weight: 600; color: var(--text-primary, #2D2D2D); margin: 8px 0 0; }
  .pw-pending-sub { font-size: 0.66rem; color: var(--text-muted, #9a9590); margin: 0; }
  .pw-cancel {
    appearance: none; border: none; background: none;
    font-size: 0.64rem; color: var(--text-muted, #9a9590);
    cursor: pointer; margin-top: 8px; text-decoration: underline;
  }

  /* Confirmed */
  .pw-check {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(39, 174, 96, 0.1); color: #27ae60;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem; font-weight: 700;
  }
  .pw-success-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.2rem; font-weight: 700; color: var(--text-primary, #2D2D2D);
    margin: 8px 0 0;
  }
  .pw-success-sub { font-size: 0.7rem; color: var(--text-muted, #9a9590); margin: 0 0 12px; }
  .pw-success-info {
    background: var(--page-bg, #FAF9F7); border-radius: 8px;
    padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;
    border: 1px solid var(--border-subtle, #EDEAE5);
    width: 100%; margin-bottom: 8px;
  }
</style>
