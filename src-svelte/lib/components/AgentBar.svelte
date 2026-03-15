<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { slide } from 'svelte/transition';
  import { agentStore, type AgentMessage } from '../stores/agentStore.ts';
  import { dashboardStore } from '../stores/dashboardStore.ts';
  import { wallet } from '../stores/walletStore.ts';
  import AppDock from './AppDock.svelte';

  let inputText = '';
  let inputEl: HTMLInputElement;
  let chatEl: HTMLDivElement;
  let expanded = false;

  $: msgList = $agentStore_messages;
  const agentStore_messages = agentStore.messages;

  // Has real conversation (beyond greeting)
  $: hasChat = msgList.length > 1;

  // Auto-expand when new agent message arrives
  let lastCount = 0;
  $: if (msgList.length > lastCount && msgList.at(-1)?.role === 'agent' && msgList.length > 1) {
    expanded = true;
    lastCount = msgList.length;
  } else {
    lastCount = msgList.length;
  }

  afterUpdate(() => {
    if (chatEl && expanded) chatEl.scrollTop = chatEl.scrollHeight;
  });

  function handleSubmit() {
    if (!inputText.trim()) return;
    agentStore.send(inputText);
    inputText = '';
    expanded = true;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      expanded = false;
    }
  }

  function handleAction(key: string) {
    agentStore.handleAction(key);
  }

  function toggleExpand() {
    if (hasChat) expanded = !expanded;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  // Global Cmd+K to focus
  function handleGlobalKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputEl?.focus();
      expanded = true;
    }
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      inputEl?.focus();
      expanded = true;
    }
  }
</script>

<svelte:window on:keydown={handleGlobalKey} />

<div class="agent-bar-wrap">
  <div class="agent-panel" class:expanded>
    <!-- Chat area (slides up) -->
    {#if expanded && hasChat}
      <div class="chat-area" transition:slide={{ duration: 220 }}>
        <div class="chat-scroll" bind:this={chatEl}>
          {#each msgList as msg (msg.id)}
            <div class="msg msg--{msg.role}">
              {#if msg.role === 'agent'}
                <span class="msg-avatar">🦉</span>
              {/if}
              <div class="msg-bubble">
                <p class="msg-text">{msg.text}</p>
                {#if msg.meta?.progress !== undefined}
                  <div class="msg-progress">
                    <div class="msg-progress-bar" style="width: {msg.meta.progress}%"></div>
                  </div>
                {/if}
                {#if msg.actions?.length}
                  <div class="msg-actions">
                    {#each msg.actions as action}
                      <button
                        class="msg-action msg-action--{action.variant || 'secondary'}"
                        on:click={() => handleAction(action.key)}
                      >{action.label}</button>
                    {/each}
                  </div>
                {/if}
                <span class="msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          {/each}
        </div>
        <button class="chat-collapse" on:click={() => expanded = false} aria-label="Collapse">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    {/if}

    <!-- Input bar (always visible) -->
    <div class="bar-row">
      {#if hasChat && !expanded}
        <button class="bar-expand" on:click={toggleExpand} aria-label="Expand chat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/if}
      <span class="bar-owl">🦉</span>
      <form class="bar-form" on:submit|preventDefault={handleSubmit}>
        <input
          bind:this={inputEl}
          bind:value={inputText}
          on:keydown={handleKeydown}
          on:focus={() => { if (hasChat) expanded = true; }}
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

  .agent-panel {
    pointer-events: auto;
    max-width: 780px;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--glass-bg, rgba(255, 255, 255, 0.96));
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 18px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10), 0 0 0 1px rgba(0, 0, 0, 0.03);
    overflow: hidden;
    transition: border-radius 200ms ease;
  }
  .agent-panel.expanded {
    border-radius: 20px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04);
  }

  /* ═══════ CHAT AREA ═══════ */
  .chat-area {
    position: relative;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }

  .chat-scroll {
    max-height: 340px;
    overflow-y: auto;
    padding: 16px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.06) transparent;
  }

  .chat-collapse {
    position: absolute;
    top: 8px;
    right: 8px;
    appearance: none;
    border: none;
    background: rgba(0, 0, 0, 0.04);
    color: var(--text-muted, #9a9590);
    width: 24px; height: 24px;
    border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 120ms;
  }
  .chat-collapse:hover {
    background: rgba(0, 0, 0, 0.08);
    color: var(--text-primary, #2D2D2D);
  }

  /* Messages */
  .msg { display: flex; gap: 8px; max-width: 100%; }
  .msg--user { justify-content: flex-end; }
  .msg--system { justify-content: center; }

  .msg-avatar {
    font-size: 0.85rem; line-height: 1;
    flex-shrink: 0; margin-top: 4px;
  }

  .msg-bubble { max-width: 85%; }

  .msg--user .msg-bubble {
    background: var(--accent, #D97757);
    color: #fff;
    border-radius: 14px 14px 4px 14px;
    padding: 8px 14px;
  }
  .msg--agent .msg-bubble {
    background: rgba(0, 0, 0, 0.03);
    color: var(--text-primary, #2D2D2D);
    border-radius: 14px 14px 14px 4px;
    padding: 8px 14px;
  }
  .msg--system .msg-bubble { background: none; text-align: center; }
  .msg--system .msg-text { font-size: 0.66rem; color: var(--text-muted); font-style: italic; }

  .msg-text {
    font-size: 0.82rem; line-height: 1.55; margin: 0;
    white-space: pre-wrap; word-break: break-word;
  }
  .msg-time {
    display: block; font-size: 0.5rem;
    color: var(--text-muted, #9a9590);
    margin-top: 3px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .msg--user .msg-time { color: rgba(255,255,255,0.4); text-align: right; }

  .msg-progress {
    width: 100%; height: 3px;
    background: rgba(0,0,0,0.06);
    border-radius: 2px; margin-top: 6px; overflow: hidden;
  }
  .msg-progress-bar {
    height: 100%; background: var(--accent, #D97757);
    border-radius: 2px; transition: width 300ms ease;
  }

  .msg-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .msg-action {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.72rem; font-weight: 600;
    padding: 5px 14px; border-radius: 100px;
    cursor: pointer; transition: all 150ms ease;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .msg-action:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }
  .msg-action--primary {
    background: var(--accent, #D97757); color: #fff;
    border-color: var(--accent, #D97757);
  }
  .msg-action--primary:hover {
    background: color-mix(in srgb, var(--accent, #D97757) 85%, #000); color: #fff;
  }

  /* ═══════ BAR ROW ═══════ */
  .bar-row {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 4px 4px 6px;
  }

  .bar-expand {
    appearance: none; border: none;
    background: rgba(217, 119, 87, 0.1);
    color: var(--accent, #D97757);
    width: 22px; height: 22px;
    border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 120ms;
    margin-right: 2px;
  }
  .bar-expand:hover { background: rgba(217, 119, 87, 0.18); }

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
    appearance: none; border: none;
    background: var(--accent, #D97757);
    color: #fff;
    width: 28px; height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: transform 100ms ease;
  }
  .bar-send:hover { transform: scale(1.08); }
  .bar-send:active { transform: scale(0.95); }

  .bar-sep {
    width: 1px; height: 24px;
    background: var(--border-subtle, #EDEAE5);
    flex-shrink: 0;
    margin: 0 2px;
  }

  /* Hide AppDock's own fixed positioning */
  .bar-row :global(.dock) {
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

  @media (max-width: 600px) {
    .agent-bar-wrap { padding: 0 6px 8px; }
    .agent-panel { border-radius: 14px; }
    .agent-panel.expanded { border-radius: 16px; }
    .bar-row { padding: 3px 3px 3px 6px; }
    .bar-input { font-size: 0.78rem; }
    .chat-scroll { max-height: 280px; padding: 12px 12px 6px; }
  }
</style>
