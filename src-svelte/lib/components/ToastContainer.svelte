<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { toasts, type Toast, type ToastType } from '../stores/toastStore.ts';

  const ICON: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    tx: '⛓',
  };

  function dismiss(id: string) {
    toasts.dismiss(id);
  }
</script>

<div class="toast-container" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.type}"
      in:fly={{ x: 320, duration: 280 }}
      out:fade={{ duration: 180 }}
      role="status"
    >
      <span class="toast-icon toast-icon--{toast.type}">{ICON[toast.type]}</span>
      <div class="toast-body">
        <span class="toast-title">{toast.title}</span>
        {#if toast.message}
          <span class="toast-msg">{toast.message}</span>
        {/if}
        {#if toast.txHash}
          <span class="toast-tx">tx: {toast.txHash}</span>
        {/if}
      </div>
      <button class="toast-close" on:click={() => dismiss(toast.id)} aria-label="닫기">×</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 60px;
    right: 16px;
    z-index: 400;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 380px;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    background: var(--surface, #fff);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: var(--radius-md, 10px);
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08));
    font-family: var(--font-body, 'Inter', sans-serif);
    animation: toastEnter 280ms var(--ease-out-expo, ease-out);
  }

  .toast--success { border-left: 3px solid var(--green, #27864a); }
  .toast--error   { border-left: 3px solid var(--red, #c0392b); }
  .toast--warning { border-left: 3px solid var(--gold, #b7860e); }
  .toast--info    { border-left: 3px solid var(--blue, #2d6ca2); }
  .toast--tx      { border-left: 3px solid var(--accent, #D97757); }

  .toast-icon {
    width: 22px; height: 22px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700;
    flex-shrink: 0; margin-top: 1px;
  }
  .toast-icon--success { background: rgba(39,134,74,0.1); color: var(--green); }
  .toast-icon--error   { background: rgba(192,57,43,0.1); color: var(--red); }
  .toast-icon--warning { background: rgba(183,134,14,0.1); color: var(--gold); }
  .toast-icon--info    { background: rgba(45,108,162,0.1); color: var(--blue); }
  .toast-icon--tx      { background: var(--accent-subtle, rgba(217,119,87,0.12)); color: var(--accent); }

  .toast-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .toast-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary, #2D2D2D);
  }

  .toast-msg {
    font-size: 0.68rem;
    color: var(--text-secondary, #6b6560);
    line-height: 1.4;
  }

  .toast-tx {
    font-family: var(--font-mono, monospace);
    font-size: 0.6rem;
    color: var(--text-muted, #9a9590);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toast-close {
    appearance: none;
    border: none;
    background: none;
    font-size: 1rem;
    color: var(--text-muted, #9a9590);
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    opacity: 0.5;
    transition: opacity 150ms;
  }
  .toast-close:hover { opacity: 1; }

  @keyframes toastEnter {
    from { opacity: 0; transform: translateX(40px) scale(0.95); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }
</style>
