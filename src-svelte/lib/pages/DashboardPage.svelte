<script lang="ts">
  import { onMount, afterUpdate, tick } from "svelte";
  import { fly } from "svelte/transition";
  import MeshCanvas from "../components/MeshCanvas.svelte";
  import AppDock from "../components/AppDock.svelte";
  import { dashboardStore } from "../stores/dashboardStore.ts";
  import { agentStore, type AgentMessage } from "../stores/agentStore.ts";
  import { wallet } from "../stores/walletStore.ts";

  let inputText = '';
  let inputEl: HTMLInputElement;
  let scrollContainer: HTMLDivElement;

  $: msgList = $agentStore_messages;
  const agentStore_messages = agentStore.messages;

  onMount(() => {
    dashboardStore.init();
    agentStore.greet();
    return () => dashboardStore.destroy();
  });

  afterUpdate(() => {
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });

  $: if ($agentStore_inputFocused) {
    tick().then(() => inputEl?.focus());
    agentStore.inputFocused.set(false);
  }
  const agentStore_inputFocused = agentStore.inputFocused;

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

  function handleAction(key: string) {
    agentStore.handleAction(key);
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="studio-home" class:mounted={$dashboardStore.mounted}>
  <!-- Globe background (subtle ambient) -->
  <div class="globe-layer">
    <MeshCanvas
      nodes={$dashboardStore.renderNodes}
      jobs={$dashboardStore.model.jobs}
      workers={$dashboardStore.model.workers}
      viewerLocation={{ lat: 37.57, lng: 126.98 }}
    />
  </div>

  <!-- ═══════ MAIN CHAT AREA ═══════ -->
  <div class="chat-area">
    <!-- Messages -->
    <div class="chat-messages" bind:this={scrollContainer}>
      {#each msgList as msg (msg.id)}
        <div class="msg msg--{msg.role}" in:fly={{ y: 8, duration: 200 }}>
          {#if msg.role === 'agent'}
            <span class="msg-avatar">🦉</span>
          {/if}
          <div class="msg-body">
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

    <!-- Input -->
    <form class="chat-input-area" on:submit|preventDefault={handleSubmit}>
      <input
        bind:this={inputEl}
        bind:value={inputText}
        on:keydown={handleKeydown}
        class="chat-input"
        placeholder="무엇이든 물어보세요... 연구 주제, 모델 대여, 상태 확인"
        autocomplete="off"
        spellcheck="false"
      />
      <button class="chat-send" type="submit" disabled={!inputText.trim()} aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </form>
  </div>

  <!-- ═══════ APP DOCK ═══════ -->
  <AppDock
    loggedIn={$wallet.connected}
    research={$dashboardStore.researchSummary}
    network={$dashboardStore.networkSummary}
    protocol={$dashboardStore.protocolSummary}
    models={$dashboardStore.modelsSummary}
    portfolio={$dashboardStore.portfolioSummary}
  />
</div>

<style>
  /* ═══════ CONTAINER ═══════ */
  .studio-home {
    opacity: 0;
    transition: opacity var(--dur-slow, 600ms) ease;
    -webkit-font-smoothing: antialiased;
    background: var(--page-bg, #FAF9F7);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }
  .studio-home.mounted { opacity: 1; }

  /* ═══════ GLOBE BACKGROUND ═══════ */
  .globe-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    filter: saturate(0.3) sepia(0.02) opacity(0.08);
    pointer-events: none;
  }

  /* ═══════ CHAT AREA ═══════ */
  .chat-area {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 680px;
    width: 100%;
    margin: 0 auto;
    padding: 0 20px;
    min-height: 0;
  }

  /* ═══════ MESSAGES ═══════ */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 32px 0 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.08) transparent;
  }

  .msg {
    display: flex;
    gap: 10px;
    max-width: 100%;
  }
  .msg--user { justify-content: flex-end; }
  .msg--system { justify-content: center; }

  .msg-avatar {
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .msg-body { max-width: 80%; }

  .msg--user .msg-body {
    background: var(--accent, #D97757);
    color: #fff;
    border-radius: 16px 16px 4px 16px;
    padding: 10px 16px;
  }

  .msg--agent .msg-body {
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    border-radius: 16px 16px 16px 4px;
    padding: 10px 16px;
    border: 1px solid var(--border-subtle, #EDEAE5);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }

  .msg--system .msg-body { background: none; text-align: center; }
  .msg--system .msg-text {
    font-size: 0.72rem;
    color: var(--text-muted, #9a9590);
    font-style: italic;
  }

  .msg-text {
    font-size: 0.88rem;
    line-height: 1.6;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .msg-time {
    display: block;
    font-size: 0.6rem;
    color: var(--text-muted, #9a9590);
    margin-top: 4px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .msg--user .msg-time {
    color: rgba(255, 255, 255, 0.5);
    text-align: right;
  }

  /* ── Progress ── */
  .msg-progress {
    width: 100%;
    height: 3px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  }
  .msg-progress-bar {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    transition: width 300ms ease;
  }

  /* ── Actions ── */
  .msg-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .msg-action {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 6px 16px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: var(--font-body, 'Inter', sans-serif);
  }
  .msg-action:hover {
    border-color: var(--accent, #D97757);
    color: var(--accent, #D97757);
  }
  .msg-action--primary {
    background: var(--accent, #D97757);
    color: #fff;
    border-color: var(--accent, #D97757);
  }
  .msg-action--primary:hover {
    background: color-mix(in srgb, var(--accent, #D97757) 85%, #000);
    color: #fff;
  }

  /* ═══════ INPUT AREA ═══════ */
  .chat-input-area {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 0 80px; /* 80px bottom for dock space */
    flex-shrink: 0;
  }

  .chat-input {
    flex: 1;
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.88rem;
    padding: 12px 18px;
    border-radius: 100px;
    outline: none;
    font-family: var(--font-body, 'Inter', sans-serif);
    transition: border-color 150ms ease, box-shadow 150ms ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
  .chat-input::placeholder { color: var(--text-muted, #9a9590); }
  .chat-input:focus {
    border-color: var(--accent, #D97757);
    box-shadow: 0 2px 12px rgba(217, 119, 87, 0.12);
  }

  .chat-send {
    appearance: none;
    border: none;
    background: var(--accent, #D97757);
    color: #fff;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 150ms ease, transform 150ms ease;
    box-shadow: 0 2px 8px rgba(217, 119, 87, 0.3);
  }
  .chat-send:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
  .chat-send:not(:disabled):hover { transform: scale(1.05); }
  .chat-send:not(:disabled):active { transform: scale(0.95); }

  /* ═══════ RESPONSIVE ═══════ */
  @media (max-width: 600px) {
    .chat-area { padding: 0 12px; }
    .chat-messages { padding: 16px 0 8px; gap: 12px; }
    .msg-body { max-width: 90%; }
    .msg-text { font-size: 0.82rem; }
    .chat-input { font-size: 0.82rem; padding: 10px 14px; }
    .chat-input-area { padding: 8px 0 72px; }
  }
</style>
