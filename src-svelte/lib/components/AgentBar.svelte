<script lang="ts">
  import { tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { agentStore, type AgentMessage } from '../stores/agentStore.ts';
  import { dashboardStore } from '../stores/dashboardStore.ts';
  import { wallet } from '../stores/walletStore.ts';
  import { router } from '../stores/router.ts';
  import AppDock from './AppDock.svelte';
  import PixelIcon from './PixelIcon.svelte';

  let inputText = '';
  let inputEl: HTMLInputElement;
  let popupOpen = false;

  $: msgList = $agentStore_messages;
  const agentStore_messages = agentStore.messages;

  // Latest agent message (for popup display)
  $: latestAgent = msgList.filter(m => m.role === 'agent').at(-1);
  $: latestUser = msgList.filter(m => m.role === 'user').at(-1);

  // Auto-open popup when agent responds
  let lastMsgCount = 0;
  $: if (msgList.length > lastMsgCount && msgList.at(-1)?.role === 'agent' && msgList.length > 1) {
    popupOpen = true;
    lastMsgCount = msgList.length;
  } else {
    lastMsgCount = msgList.length;
  }

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
    if (e.key === 'Escape') {
      popupOpen = false;
    }
  }

  function handleAction(key: string) {
    agentStore.handleAction(key);
    popupOpen = false;
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
  <!-- Popup response -->
  {#if popupOpen && latestAgent && msgList.length > 1}
    <div class="agent-popup" in:fly={{ y: 12, duration: 200 }} role="dialog">
      <button class="popup-close" on:click={() => popupOpen = false} aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      {#if latestUser}
        <div class="popup-query">
          <span class="popup-query-text">{latestUser.text}</span>
        </div>
      {/if}

      <div class="popup-response">
        <span class="popup-owl">🦉</span>
        <div class="popup-body">
          <p class="popup-text">{latestAgent.text}</p>
          {#if latestAgent.meta?.progress !== undefined}
            <div class="popup-progress">
              <div class="popup-progress-bar" style="width: {latestAgent.meta.progress}%"></div>
            </div>
          {/if}
          {#if latestAgent.actions?.length}
            <div class="popup-actions">
              {#each latestAgent.actions as action}
                <button
                  class="popup-action popup-action--{action.variant || 'secondary'}"
                  on:click={() => handleAction(action.key)}
                >{action.label}</button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Agent Bar (input + dock) -->
  <div class="agent-bar">
    <div class="bar-input-wrap">
      <span class="bar-owl">🦉</span>
      <form class="bar-form" on:submit|preventDefault={handleSubmit}>
        <input
          bind:this={inputEl}
          bind:value={inputText}
          on:keydown={handleKeydown}
          on:focus={() => { /* noop — just show focus ring */ }}
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
  /* ═══════ WRAPPER ═══════ */
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

  /* ═══════ AGENT BAR ═══════ */
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

  /* ═══════ POPUP ═══════ */
  .agent-popup {
    max-width: 520px;
    width: 100%;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.14);
    padding: 16px;
    margin-bottom: 8px;
    position: relative;
  }

  .popup-close {
    position: absolute;
    top: 10px;
    right: 10px;
    appearance: none;
    border: none;
    background: none;
    color: var(--text-muted, #9a9590);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    transition: color 150ms;
  }
  .popup-close:hover { color: var(--text-primary, #2D2D2D); }

  .popup-query {
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .popup-query-text {
    font-size: 0.75rem;
    color: var(--text-muted, #9a9590);
    font-style: italic;
  }

  .popup-response {
    display: flex;
    gap: 10px;
  }

  .popup-owl {
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .popup-body { flex: 1; min-width: 0; }

  .popup-text {
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0;
    color: var(--text-primary, #2D2D2D);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .popup-progress {
    width: 100%;
    height: 3px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  }
  .popup-progress-bar {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    transition: width 300ms ease;
  }

  .popup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .popup-action {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .popup-action:hover {
    border-color: var(--accent, #D97757);
    color: var(--accent, #D97757);
  }
  .popup-action--primary {
    background: var(--accent, #D97757);
    color: #fff;
    border-color: var(--accent, #D97757);
  }
  .popup-action--primary:hover {
    background: color-mix(in srgb, var(--accent, #D97757) 85%, #000);
    color: #fff;
  }

  /* ═══════ RESPONSIVE ═══════ */
  @media (max-width: 600px) {
    .agent-bar-wrap { padding: 0 6px 8px; }
    .agent-bar { border-radius: 14px; padding: 3px 3px 3px 6px; }
    .bar-input { font-size: 0.78rem; }
    .agent-popup { border-radius: 12px; padding: 12px; margin-bottom: 6px; }
  }
</style>
