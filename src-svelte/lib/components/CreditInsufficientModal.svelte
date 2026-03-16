<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  export let open = false;
  export let required = 10;
  export let available = 0;

  const dispatch = createEventDispatcher<{
    close: void;
    buyCredits: void;
  }>();

  $: deficit = Math.max(0, required - available);
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-interactive-supports-focus -->
  <div class="ci-overlay" on:click|self={() => dispatch('close')} role="dialog" aria-modal="true" transition:fade={{ duration: 180 }}>
    <div class="ci-card" in:fly={{ y: 20, duration: 280 }}>
      <button class="ci-close" on:click={() => dispatch('close')}>×</button>

      <div class="ci-icon">⚡</div>
      <h3 class="ci-title">Insufficient Credits</h3>
      <p class="ci-desc">Additional credits are needed to start this research</p>

      <div class="ci-breakdown">
        <div class="ci-row">
          <span class="ci-label">Required</span>
          <span class="ci-val">{required.toFixed(1)} HOOT</span>
        </div>
        <div class="ci-row">
          <span class="ci-label">Available</span>
          <span class="ci-val">{available.toFixed(1)} HOOT</span>
        </div>
        <div class="ci-divider"></div>
        <div class="ci-row ci-row--deficit">
          <span class="ci-label">Shortfall</span>
          <span class="ci-val ci-val--red">{deficit.toFixed(1)} HOOT</span>
        </div>
      </div>

      <div class="ci-actions">
        <button class="ci-btn ci-btn--primary" on:click={() => dispatch('buyCredits')}>
          Buy Credits →
        </button>
        <button class="ci-btn ci-btn--secondary" on:click={() => dispatch('close')}>
          Not Now
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ci-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: var(--z-modal, 300);
    padding: 24px;
  }

  .ci-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-lg, 16px);
    padding: 32px 28px;
    max-width: 400px; width: 100%;
    text-align: center;
    position: relative;
    box-shadow: var(--shadow-lg);
    animation: scaleIn 300ms var(--ease-out-expo);
  }

  .ci-close {
    position: absolute; top: 14px; right: 14px;
    width: 28px; height: 28px; border: none;
    background: var(--page-bg, #FAF9F7);
    border-radius: 50%; font-size: 1.1rem;
    color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 150ms;
  }
  .ci-close:hover { background: var(--accent-subtle); color: var(--accent); }

  .ci-icon {
    font-size: 2rem;
    margin-bottom: 8px;
  }

  .ci-title {
    font-family: var(--font-display, serif);
    font-size: 1.2rem; font-weight: 700;
    color: var(--text-primary); margin: 0 0 4px;
  }

  .ci-desc {
    font-size: 0.74rem; color: var(--text-muted);
    margin: 0 0 20px; line-height: 1.4;
  }

  .ci-breakdown {
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: var(--radius-md, 10px);
    padding: 14px 16px;
    margin-bottom: 20px;
    text-align: left;
  }

  .ci-row {
    display: flex; justify-content: space-between;
    align-items: center; padding: 4px 0;
  }

  .ci-label {
    font-size: 0.72rem; color: var(--text-muted);
    font-weight: 500;
  }

  .ci-val {
    font-family: var(--font-mono, monospace);
    font-size: 0.78rem; font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .ci-val--red { color: var(--red, #c0392b); }

  .ci-divider {
    height: 1px;
    background: var(--border-subtle, #EDEAE5);
    margin: 6px 0;
  }

  .ci-row--deficit .ci-label { font-weight: 600; color: var(--text-primary); }

  .ci-actions {
    display: flex; flex-direction: column; gap: 8px;
  }

  .ci-btn {
    width: 100%; padding: 12px;
    border-radius: var(--radius-md, 10px);
    font-family: var(--font-body, sans-serif);
    font-size: 0.82rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
    border: none;
  }

  .ci-btn--primary {
    background: var(--accent, #D97757); color: #fff;
  }
  .ci-btn--primary:hover {
    background: var(--accent-hover, #C4644A);
    box-shadow: 0 4px 16px rgba(217,119,87,0.3);
  }

  .ci-btn--secondary {
    background: transparent; color: var(--text-muted);
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .ci-btn--secondary:hover {
    border-color: var(--accent); color: var(--accent);
  }
</style>
