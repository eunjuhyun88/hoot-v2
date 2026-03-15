<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  export let open = false;
  export let topic = '';
  export let progress = 0;
  export let experimentsCompleted = 0;
  export let totalExperiments = 0;

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-interactive-supports-focus -->
  <div class="sc-overlay" on:click|self={() => dispatch('cancel')} role="dialog" aria-modal="true" transition:fade={{ duration: 150 }}>
    <div class="sc-card" in:fly={{ y: 16, duration: 240 }}>
      <button class="sc-close" on:click={() => dispatch('cancel')}>×</button>

      <div class="sc-icon">⏹</div>
      <h3 class="sc-title">연구 중지</h3>
      <p class="sc-desc">진행 중인 연구를 중지하시겠습니까?</p>

      <div class="sc-info">
        <div class="sc-row">
          <span class="sc-label">연구 주제</span>
          <span class="sc-val">{topic || '—'}</span>
        </div>
        <div class="sc-row">
          <span class="sc-label">진행률</span>
          <span class="sc-val">{progress}%</span>
        </div>
        <div class="sc-row">
          <span class="sc-label">실험</span>
          <span class="sc-val sc-val--mono">{experimentsCompleted}/{totalExperiments}</span>
        </div>
        <div class="sc-divider"></div>
        <div class="sc-row sc-row--warn">
          <span class="sc-label">⚠ 이 작업은 온체인 서명이 필요합니다</span>
        </div>
      </div>

      <div class="sc-warning">
        중지하면 현재까지의 실험 결과만 유지됩니다. 미완료 실험은 폐기되며, 사용한 크레딧은 환불되지 않습니다.
      </div>

      <div class="sc-actions">
        <button class="sc-btn sc-btn--danger" on:click={() => dispatch('confirm')}>
          서명 후 중지
        </button>
        <button class="sc-btn sc-btn--cancel" on:click={() => dispatch('cancel')}>
          계속 진행
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sc-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: var(--z-modal, 300);
    padding: 24px;
  }

  .sc-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-lg, 16px);
    padding: 28px 24px;
    max-width: 400px; width: 100%;
    text-align: center;
    position: relative;
    box-shadow: var(--shadow-lg);
  }

  .sc-close {
    position: absolute; top: 14px; right: 14px;
    width: 28px; height: 28px; border: none;
    background: var(--page-bg, #FAF9F7);
    border-radius: 50%; font-size: 1.1rem;
    color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 150ms;
  }
  .sc-close:hover { background: var(--accent-subtle); color: var(--accent); }

  .sc-icon { font-size: 1.8rem; margin-bottom: 8px; }

  .sc-title {
    font-family: var(--font-display, serif);
    font-size: 1.05rem; font-weight: 700;
    color: var(--text-primary); margin: 0 0 4px;
  }

  .sc-desc {
    font-size: 0.74rem; color: var(--text-muted);
    margin: 0 0 16px; line-height: 1.4;
  }

  .sc-info {
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: var(--radius-md, 10px);
    padding: 12px 14px;
    margin-bottom: 12px;
    text-align: left;
  }

  .sc-row {
    display: flex; justify-content: space-between;
    align-items: center; padding: 3px 0;
  }

  .sc-label {
    font-size: 0.7rem; color: var(--text-muted);
    font-weight: 500;
  }

  .sc-val {
    font-size: 0.74rem; font-weight: 600;
    color: var(--text-primary);
  }

  .sc-val--mono {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
  }

  .sc-divider {
    height: 1px;
    background: var(--border-subtle, #EDEAE5);
    margin: 6px 0;
  }

  .sc-row--warn .sc-label {
    font-size: 0.64rem;
    color: var(--red, #c0392b);
    font-weight: 600;
  }

  .sc-warning {
    font-size: 0.68rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 16px;
    padding: 10px;
    background: rgba(192, 57, 43, 0.04);
    border-radius: var(--radius-sm, 6px);
    border-left: 3px solid var(--red, #c0392b);
    text-align: left;
  }

  .sc-actions { display: flex; flex-direction: column; gap: 8px; }

  .sc-btn {
    width: 100%; padding: 11px;
    border-radius: var(--radius-md, 10px);
    font-family: var(--font-body, sans-serif);
    font-size: 0.8rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
    border: none;
  }

  .sc-btn--danger {
    background: var(--red, #c0392b); color: #fff;
  }
  .sc-btn--danger:hover {
    background: #a93226;
    box-shadow: 0 4px 12px rgba(192,57,43,0.3);
  }

  .sc-btn--cancel {
    background: transparent; color: var(--text-muted);
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .sc-btn--cancel:hover {
    border-color: var(--green, #27864a); color: var(--green, #27864a);
  }
</style>
