<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';

  export let visible = false;
  export let reason = '';
  export let txHash = '';

  const dispatch = createEventDispatcher<{
    dismiss: void;
    viewDetails: void;
  }>();
</script>

{#if visible}
  <div class="fc-banner" in:fly={{ y: -8, duration: 200 }} out:fly={{ y: -8, duration: 150 }}>
    <div class="fc-left">
      <span class="fc-icon">🚫</span>
      <span class="fc-label">FORCE CANCELLED</span>
      <span class="fc-reason">{reason || 'Protocol initiated cancellation'}</span>
    </div>
    <div class="fc-right">
      {#if txHash}
        <button class="fc-btn" on:click={() => dispatch('viewDetails')}>
          tx: {txHash.slice(0, 10)}…
        </button>
      {/if}
      <button class="fc-dismiss" on:click={() => dispatch('dismiss')}>×</button>
    </div>
  </div>
{/if}

<style>
  .fc-banner {
    position: absolute;
    top: 8px;
    left: 50%; transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(192, 57, 43, 0.08);
    border: 1px solid rgba(192, 57, 43, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: var(--radius-pill, 100px);
    padding: 6px 10px 6px 14px;
    max-width: 600px;
    width: max-content;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }

  .fc-left {
    display: flex; align-items: center; gap: 8px;
    flex: 1; min-width: 0;
  }

  .fc-icon { font-size: 0.9rem; flex-shrink: 0; }

  .fc-label {
    font-size: 0.58rem;
    font-weight: 800;
    color: var(--red, #c0392b);
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .fc-reason {
    font-size: 0.62rem;
    color: var(--text-secondary, #6b6560);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    min-width: 0;
  }

  .fc-right {
    display: flex; align-items: center; gap: 4px;
    flex-shrink: 0;
  }

  .fc-btn {
    appearance: none; border: none;
    background: rgba(192, 57, 43, 0.1);
    color: var(--red, #c0392b);
    font-family: var(--font-mono, monospace);
    font-size: 0.56rem; font-weight: 600;
    padding: 3px 8px; border-radius: 4px;
    cursor: pointer; transition: background 150ms;
  }
  .fc-btn:hover { background: rgba(192, 57, 43, 0.18); }

  .fc-dismiss {
    appearance: none; border: none; background: transparent;
    color: var(--text-muted, #9a9590);
    font-size: 0.9rem; cursor: pointer;
    padding: 0 4px; line-height: 1;
    transition: color 150ms;
  }
  .fc-dismiss:hover { color: var(--red, #c0392b); }
</style>
