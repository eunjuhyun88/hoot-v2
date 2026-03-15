<script lang="ts">
  import { agentStore } from '../stores/agentStore.ts';
  import { dashboardStore } from '../stores/dashboardStore.ts';
  import { wallet } from '../stores/walletStore.ts';
  import AppDock from './AppDock.svelte';

  let inputText = '';
  let inputEl: HTMLInputElement;

  function handleSubmit() {
    if (!inputText.trim()) return;
    agentStore.send(inputText);
    inputText = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Global Cmd+K to focus
  function handleGlobalKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputEl?.focus();
    }
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      inputEl?.focus();
    }
  }
</script>

<svelte:window on:keydown={handleGlobalKey} />

<div class="agent-bar-wrap">
  <div class="agent-bar">
    <div class="bar-input-wrap">
      <span class="bar-owl">🦉</span>
      <form class="bar-form" on:submit|preventDefault={handleSubmit}>
        <input
          bind:this={inputEl}
          bind:value={inputText}
          on:keydown={handleKeydown}
          class="bar-input"
          placeholder="무엇이든 물어보세요...  ⌘K"
          autocomplete="off"
          spellcheck="false"
        />
        {#if inputText.trim()}
          <button class="bar-send" type="submit" aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        {/if}
      </form>
    </div>

    <div class="bar-sep"></div>

    <AppDock
      loggedIn={$wallet.connected}
      research={$dashboardStore.researchSummary}
      network={$dashboardStore.networkSummary}
      protocol={$dashboardStore.protocolSummary}
      models={$dashboardStore.modelsSummary}
      portfolio={$dashboardStore.portfolioSummary}
    />
  </div>
</div>

<style>
  .agent-bar-wrap {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-splash, 9999);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    padding: 0 12px 12px;
  }

  .agent-bar-wrap > * {
    pointer-events: auto;
  }

  .agent-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--glass-bg, rgba(255, 255, 255, 0.94));
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 18px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10), 0 0 0 1px rgba(0, 0, 0, 0.03);
    padding: 4px 4px 4px 6px;
    max-width: 780px;
    width: 100%;
  }

  /* Hide AppDock's own fixed positioning — it's now inline */
  .agent-bar :global(.dock) {
    position: static !important;
    transform: none !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    padding: 2px 4px !important;
    max-width: none !important;
  }

  .bar-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .bar-owl {
    font-size: 1rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .bar-form {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .bar-input {
    flex: 1;
    appearance: none;
    border: none;
    background: transparent;
    color: var(--text-primary, #2D2D2D);
    font-size: 0.82rem;
    padding: 8px 4px;
    outline: none;
    font-family: var(--font-body, 'Inter', sans-serif);
    min-width: 0;
  }
  .bar-input::placeholder {
    color: var(--text-muted, #9a9590);
    font-size: 0.78rem;
  }

  .bar-send {
    appearance: none;
    border: none;
    background: var(--accent, #D97757);
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 100ms ease;
  }
  .bar-send:hover { transform: scale(1.08); }
  .bar-send:active { transform: scale(0.95); }

  .bar-sep {
    width: 1px;
    height: 24px;
    background: var(--border-subtle, #EDEAE5);
    flex-shrink: 0;
    margin: 0 2px;
  }

  @media (max-width: 600px) {
    .agent-bar-wrap { padding: 0 6px 8px; }
    .agent-bar { border-radius: 14px; padding: 3px 3px 3px 6px; }
    .bar-input { font-size: 0.78rem; }
  }
</style>
