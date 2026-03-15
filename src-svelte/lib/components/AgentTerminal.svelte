<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';
  import { agentStore, type AgentMessage } from '../stores/agentStore.ts';
  import { fly, fade } from 'svelte/transition';

  let inputText = '';
  let inputEl: HTMLInputElement;
  let scrollContainer: HTMLDivElement;
  let collapsed = false;

  $: msgList = $agentStore_messages;

  const agentStore_messages = agentStore.messages;

  onMount(() => {
    agentStore.greet();
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

<aside class="agent-terminal" class:collapsed>
  <header class="at-header">
    <button class="at-toggle" on:click={() => collapsed = !collapsed}>
      <span class="at-owl">🦉</span>
      <span class="at-title">HOOT Agent</span>
      {#if collapsed}
        <span class="at-badge">{msgList.length}</span>
      {/if}
    </button>
    <button class="at-collapse-btn" on:click={() => collapsed = !collapsed} aria-label="Toggle panel">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        {#if collapsed}
          <path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        {:else}
          <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        {/if}
      </svg>
    </button>
  </header>

  {#if !collapsed}
    <div class="at-messages" bind:this={scrollContainer}>
      {#each msgList as msg (msg.id)}
        <div
          class="at-msg at-msg--{msg.role}"
          in:fly={{ y: 8, duration: 200 }}
        >
          {#if msg.role === 'agent'}
            <span class="at-msg-avatar">🦉</span>
          {/if}
          <div class="at-msg-body">
            <p class="at-msg-text">{msg.text}</p>
            {#if msg.meta?.progress !== undefined}
              <div class="at-progress">
                <div class="at-progress-bar" style="width: {msg.meta.progress}%"></div>
              </div>
            {/if}
            {#if msg.actions?.length}
              <div class="at-actions">
                {#each msg.actions as action}
                  <button
                    class="at-action at-action--{action.variant || 'secondary'}"
                    on:click={() => handleAction(action.key)}
                  >
                    {action.label}
                  </button>
                {/each}
              </div>
            {/if}
            <span class="at-msg-time">{formatTime(msg.timestamp)}</span>
          </div>
        </div>
      {/each}
    </div>

    <form class="at-input-area" on:submit|preventDefault={handleSubmit}>
      <input
        bind:this={inputEl}
        bind:value={inputText}
        on:keydown={handleKeydown}
        class="at-input"
        placeholder="무엇이든 물어보세요..."
        autocomplete="off"
        spellcheck="false"
      />
      <button class="at-send" type="submit" disabled={!inputText.trim()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </form>
  {/if}
</aside>

<style>
  .agent-terminal {
    display: flex;
    flex-direction: column;
    width: 320px;
    min-width: 320px;
    flex-shrink: 0;
    background: var(--surface, #fff);
    border-left: 1px solid var(--border, #E5E0DA);
    transition: width 200ms var(--ease-smooth, ease), min-width 200ms var(--ease-smooth, ease);
    overflow: hidden;
  }

  .agent-terminal.collapsed {
    width: 48px;
    min-width: 48px;
  }

  /* ── Header ── */
  .at-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    flex-shrink: 0;
  }

  .at-toggle {
    appearance: none;
    border: none;
    background: none;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 0;
  }

  .at-owl {
    font-size: 1.2rem;
    line-height: 1;
  }

  .at-title {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .collapsed .at-title {
    display: none;
  }

  .at-badge {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.58rem;
    font-weight: 700;
    background: var(--accent, #D97757);
    color: #fff;
    padding: 1px 5px;
    border-radius: 8px;
    min-width: 16px;
    text-align: center;
  }

  .collapsed .at-badge {
    display: none;
  }

  .at-collapse-btn {
    appearance: none;
    border: none;
    background: none;
    color: var(--text-muted, #9a9590);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 150ms ease, background 150ms ease;
  }

  .at-collapse-btn:hover {
    color: var(--text-primary, #2D2D2D);
    background: rgba(0, 0, 0, 0.04);
  }

  .collapsed .at-collapse-btn {
    margin: 0 auto;
  }

  /* ── Messages ── */
  .at-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.1) transparent;
  }

  .at-msg {
    display: flex;
    gap: 8px;
    max-width: 100%;
  }

  .at-msg--user {
    justify-content: flex-end;
  }

  .at-msg--system {
    justify-content: center;
  }

  .at-msg-avatar {
    font-size: 0.9rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .at-msg-body {
    max-width: 85%;
  }

  .at-msg--user .at-msg-body {
    background: var(--accent, #D97757);
    color: #fff;
    border-radius: 12px 12px 2px 12px;
    padding: 8px 12px;
  }

  .at-msg--agent .at-msg-body {
    background: var(--surface-raised, #f5f3f0);
    color: var(--text-primary, #2D2D2D);
    border-radius: 12px 12px 12px 2px;
    padding: 8px 12px;
  }

  .at-msg--system .at-msg-body {
    background: none;
    text-align: center;
  }

  .at-msg--system .at-msg-text {
    font-size: 0.68rem;
    color: var(--text-muted, #9a9590);
    font-style: italic;
  }

  .at-msg-text {
    font-size: 0.82rem;
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .at-msg--user .at-msg-text {
    font-size: 0.82rem;
  }

  .at-msg-time {
    display: block;
    font-size: 0.58rem;
    color: var(--text-muted, #9a9590);
    margin-top: 4px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }

  .at-msg--user .at-msg-time {
    color: rgba(255, 255, 255, 0.6);
    text-align: right;
  }

  /* ── Progress ── */
  .at-progress {
    width: 100%;
    height: 3px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
  }

  .at-progress-bar {
    height: 100%;
    background: var(--accent, #D97757);
    border-radius: 2px;
    transition: width 300ms ease;
  }

  /* ── Action Buttons ── */
  .at-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .at-action {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.72rem;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: var(--font-body, 'Inter', sans-serif);
  }

  .at-action:hover {
    border-color: var(--accent, #D97757);
    color: var(--accent, #D97757);
  }

  .at-action--primary {
    background: var(--accent, #D97757);
    color: #fff;
    border-color: var(--accent, #D97757);
  }

  .at-action--primary:hover {
    background: color-mix(in srgb, var(--accent, #D97757) 85%, #000);
    color: #fff;
  }

  .at-action--danger {
    color: var(--red, #c0392b);
    border-color: color-mix(in srgb, var(--red, #c0392b) 30%, transparent);
  }

  .at-action--danger:hover {
    background: color-mix(in srgb, var(--red, #c0392b) 6%, transparent);
    border-color: var(--red, #c0392b);
  }

  /* ── Input Area ── */
  .at-input-area {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--border-subtle, #EDEAE5);
    flex-shrink: 0;
    background: var(--surface, #fff);
  }

  .at-input {
    flex: 1;
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface-raised, #f5f3f0);
    color: var(--text-primary, #2D2D2D);
    font-size: 0.82rem;
    padding: 8px 12px;
    border-radius: 100px;
    outline: none;
    font-family: var(--font-body, 'Inter', sans-serif);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }

  .at-input::placeholder {
    color: var(--text-muted, #9a9590);
  }

  .at-input:focus {
    border-color: var(--accent, #D97757);
    box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1);
  }

  .at-send {
    appearance: none;
    border: none;
    background: var(--accent, #D97757);
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .at-send:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .at-send:not(:disabled):hover {
    transform: scale(1.05);
  }

  .at-send:not(:disabled):active {
    transform: scale(0.95);
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .agent-terminal {
      width: 100%;
      min-width: 100%;
      height: auto;
      max-height: 50vh;
      border-left: none;
      border-top: 1px solid var(--border, #E5E0DA);
    }

    .agent-terminal.collapsed {
      width: 100%;
      min-width: 100%;
      max-height: 48px;
    }
  }
</style>
