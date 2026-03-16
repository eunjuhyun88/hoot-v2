<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  export let open = false;
  export let walletName = '';

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-interactive-supports-focus -->
  <div class="dc-overlay" on:click|self={() => dispatch('cancel')} role="dialog" aria-modal="true" transition:fade={{ duration: 150 }}>
    <div class="dc-card" in:fly={{ y: 16, duration: 240 }}>
      <div class="dc-icon">⚠️</div>
      <h3 class="dc-title">Disconnect Wallet</h3>
      <p class="dc-desc">
        Disconnect <strong>{walletName}</strong>?<br/>
        Any pending transactions may be interrupted.
      </p>
      <div class="dc-actions">
        <button class="dc-btn dc-btn--danger" on:click={() => dispatch('confirm')}>
          Disconnect
        </button>
        <button class="dc-btn dc-btn--cancel" on:click={() => dispatch('cancel')}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dc-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: var(--z-modal, 300);
    padding: 24px;
  }

  .dc-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-lg, 16px);
    padding: 28px 24px;
    max-width: 360px; width: 100%;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }

  .dc-icon { font-size: 1.8rem; margin-bottom: 8px; }

  .dc-title {
    font-family: var(--font-display, serif);
    font-size: 1.05rem; font-weight: 700;
    color: var(--text-primary); margin: 0 0 8px;
  }

  .dc-desc {
    font-size: 0.74rem; color: var(--text-muted);
    line-height: 1.5; margin: 0 0 20px;
  }
  .dc-desc strong { color: var(--text-primary); }

  .dc-actions { display: flex; flex-direction: column; gap: 8px; }

  .dc-btn {
    width: 100%; padding: 11px;
    border-radius: var(--radius-md, 10px);
    font-family: var(--font-body, sans-serif);
    font-size: 0.8rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
    border: none;
  }

  .dc-btn--danger {
    background: var(--red, #c0392b); color: #fff;
  }
  .dc-btn--danger:hover {
    background: #a93226;
    box-shadow: 0 4px 12px rgba(192,57,43,0.3);
  }

  .dc-btn--cancel {
    background: transparent; color: var(--text-muted);
    border: 1px solid var(--border-subtle, #EDEAE5);
  }
  .dc-btn--cancel:hover {
    border-color: var(--text-secondary); color: var(--text-secondary);
  }
</style>
