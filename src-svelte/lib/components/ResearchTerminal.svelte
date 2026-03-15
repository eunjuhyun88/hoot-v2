<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Experiment } from '../stores/jobStore.ts';

  export let eventLog: { time: string; type: string; message: string }[] = [];
  export let trainingExp: Experiment | null = null;
  export let title: string = 'hoot \u2014 research log';
  export let collapsed: boolean = false;

  const LOG_TYPES = ['KEEP', 'CRASH', 'DISCARD', 'SYSTEM', 'TRAIN'] as const;

  let terminalEl: HTMLDivElement;
  let scrollRafHandle: number | null = null;
  let searchQuery = '';
  let hiddenTypes = new Set<string>();

  function toggleType(type: string) {
    const next = new Set(hiddenTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    hiddenTypes = next;
  }

  $: filteredLog = eventLog.filter(evt => {
    if (hiddenTypes.has(evt.type)) return false;
    if (searchQuery && !evt.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  $: typeCounts = (() => {
    const counts: Record<string, number> = {};
    for (const t of LOG_TYPES) counts[t] = 0;
    for (const evt of eventLog) {
      if (counts[evt.type] !== undefined) counts[evt.type]++;
    }
    return counts;
  })();

  // Auto-scroll with RAF cleanup
  $: if (terminalEl && filteredLog.length && !collapsed) {
    if (scrollRafHandle !== null) cancelAnimationFrame(scrollRafHandle);
    scrollRafHandle = requestAnimationFrame(() => {
      if (terminalEl) terminalEl.scrollTop = terminalEl.scrollHeight;
      scrollRafHandle = null;
    });
  }

  onDestroy(() => {
    if (scrollRafHandle !== null) cancelAnimationFrame(scrollRafHandle);
  });
</script>

{#if !collapsed}
  <div class="run-terminal">
    <div class="term-header">
      <div class="term-dots">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span class="term-title">{title}</span>
      </div>
      <div class="filter-bar">
        {#each LOG_TYPES as logType}
          <button
            class="filter-btn"
            class:active={!hiddenTypes.has(logType)}
            class:type-keep={logType === 'KEEP'}
            class:type-crash={logType === 'CRASH'}
            class:type-discard={logType === 'DISCARD'}
            class:type-system={logType === 'SYSTEM'}
            class:type-train={logType === 'TRAIN'}
            on:click={() => toggleType(logType)}
            title="{logType} ({typeCounts[logType]})"
          >
            {logType}
            {#if typeCounts[logType] > 0}<span class="filter-count">{typeCounts[logType]}</span>{/if}
          </button>
        {/each}
        <input
          type="text"
          class="filter-search"
          bind:value={searchQuery}
          placeholder="filter..."
        />
      </div>
    </div>
    <div class="term-body term-scroll" bind:this={terminalEl}>
      {#each filteredLog as evt}
        <div class="term-log-line" class:keep={evt.type === 'KEEP'} class:crash={evt.type === 'CRASH'}>
          <span class="tl-time">{evt.time}</span>
          <span class="tl-type"
            class:type-keep={evt.type === 'KEEP'}
            class:type-crash={evt.type === 'CRASH'}
            class:type-discard={evt.type === 'DISCARD'}
            class:type-system={evt.type === 'SYSTEM' || evt.type === 'SUBMIT'}
            class:type-training={evt.type === 'TRAIN'}
          >{evt.type}</span>
          <span class="tl-msg">{evt.message}</span>
        </div>
      {/each}
      {#if trainingExp && !hiddenTypes.has('TRAIN')}
        <div class="term-log-line training">
          <span class="tl-time">now</span>
          <span class="tl-type type-training">TRAIN</span>
          <span class="tl-msg">#{trainingExp.id} {trainingExp.modification} <span class="tl-blink">{'\u2588'}</span></span>
        </div>
      {/if}
      {#if filteredLog.length === 0 && !trainingExp}
        <div class="term-empty">No log entries{searchQuery ? ` matching "${searchQuery}"` : ''}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .run-terminal {
    background: #0D0D14; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
    height: 100%;
  }
  .term-header { flex-shrink: 0; }
  .term-dots {
    display: flex; align-items: center; gap: 6px; padding: 8px 14px;
    background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .dot.red { background: #FF5F57; }
  .dot.yellow { background: #FEBC2E; }
  .dot.green { background: #28C840; }
  .term-title {
    margin-left: 8px; font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.6rem; color: rgba(255,255,255,0.3); letter-spacing: 0.04em;
  }

  /* Filter bar */
  .filter-bar {
    display: flex; align-items: center; gap: 3px;
    padding: 4px 10px;
    background: rgba(255,255,255,0.015);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .filter-btn {
    display: flex; align-items: center; gap: 3px;
    padding: 2px 6px; border-radius: 3px;
    border: 1px solid transparent;
    background: transparent; color: rgba(255,255,255,0.2);
    font: 600 8px/1 var(--font-mono, 'JetBrains Mono', monospace);
    letter-spacing: 0.03em; cursor: pointer; transition: all 150ms;
    text-transform: uppercase;
  }
  .filter-btn.active { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.08); }
  .filter-btn.active.type-keep { color: #4ade80; border-color: rgba(74,222,128,0.2); }
  .filter-btn.active.type-crash { color: #f87171; border-color: rgba(248,113,113,0.2); }
  .filter-btn.active.type-discard { color: rgba(255,255,255,0.35); }
  .filter-btn.active.type-system { color: #D97757; border-color: rgba(217,119,87,0.2); }
  .filter-btn.active.type-train { color: #fbbf24; border-color: rgba(251,191,36,0.2); }
  .filter-btn:hover { background: rgba(255,255,255,0.04); }
  .filter-count {
    font: 500 7px/1 var(--font-mono, monospace);
    color: rgba(255,255,255,0.25);
    padding: 1px 3px; border-radius: 2px;
    background: rgba(255,255,255,0.04);
  }
  .filter-search {
    margin-left: auto; width: 80px;
    padding: 2px 6px; border-radius: 3px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.5);
    font: 400 8px/1 var(--font-mono, monospace);
    outline: none; transition: border-color 200ms;
  }
  .filter-search:focus { border-color: rgba(137,180,250,0.4); }
  .filter-search::placeholder { color: rgba(255,255,255,0.15); }

  /* Scrollable body */
  .term-body {
    padding: 8px 12px; font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem; line-height: 1.6;
  }
  .term-scroll {
    flex: 1; min-height: 0; overflow-y: auto;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
  }
  .term-scroll::-webkit-scrollbar { width: 4px; }
  .term-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  .term-log-line {
    display: flex; align-items: baseline; gap: 8px; padding: 1px 0;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.65rem; color: rgba(255,255,255,0.5); line-height: 1.5;
  }
  .term-log-line.keep { color: rgba(39,134,74,0.9); }
  .term-log-line.crash { color: rgba(192,57,43,0.7); }
  .term-log-line.training { color: rgba(183,134,14,0.9); }

  .tl-time { color: rgba(255,255,255,0.2); flex-shrink: 0; min-width: 44px; font-size: 0.58rem; }
  .tl-type {
    flex-shrink: 0; min-width: 48px; font-weight: 700;
    font-size: 0.55rem; letter-spacing: 0.04em;
  }
  .tl-type.type-keep { color: #4ade80; }
  .tl-type.type-crash { color: #f87171; }
  .tl-type.type-discard { color: rgba(255,255,255,0.3); }
  .tl-type.type-system { color: #D97757; }
  .tl-type.type-training { color: #fbbf24; }
  .tl-msg { flex: 1; min-width: 0; white-space: normal; word-break: break-word; }
  .tl-blink { animation: blink 0.8s step-end infinite; color: #fbbf24; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  .term-empty {
    font: 400 0.6rem/1 var(--font-mono, monospace);
    color: rgba(255,255,255,0.15);
    padding: 12px 0; text-align: center;
  }
</style>
