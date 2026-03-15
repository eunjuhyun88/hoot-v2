<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import TerminalHeader from './TerminalHeader.svelte';

  export let expandable = false;

  const dispatch = createEventDispatcher<{ launch: string; expand: void }>();

  let inputText = '';
  let inputEl: HTMLTextAreaElement;

  const presets = [
    { label: 'Crypto Market Prediction', desc: 'Price movements using on-chain + sentiment' },
    { label: 'DeFi Protocol Risk', desc: 'Classify risk via TVL and audit history' },
    { label: 'Fraud Detection', desc: 'Identify suspicious wallet patterns' },
    { label: 'Time Series Forecasting', desc: 'Multi-variate financial forecasting' },
  ];

  function handleLaunch() {
    if (!inputText.trim()) return;
    dispatch('launch', inputText.trim());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleLaunch();
  }

  function usePreset(label: string) {
    inputText = label;
    if (inputEl) inputEl.focus();
  }
</script>

<TerminalHeader title="Start Research" showExpand={expandable} on:expand>
  <span slot="before" class="ctx-icon">&#x26A1;</span>
</TerminalHeader>

<div class="guide-section">
  <p class="guide-text">Describe what you want to research. The system will auto-generate a dataset, design branch strategies, and run parallel experiments.</p>
  <div class="input-group">
    <span class="input-label">Research Topic</span>
    <textarea class="topic-input" bind:value={inputText} bind:this={inputEl} placeholder="e.g., Predict short-term cryptocurrency price movements using on-chain metrics, market data, and sentiment indicators" on:keydown={handleKeydown} rows="3"></textarea>
    <span class="input-hint">{'\u2318'}+Enter to launch</span>
  </div>
  <button class="action-btn primary launch-btn" on:click={handleLaunch} disabled={!inputText.trim()}>
    <svg width="12" height="12" viewBox="0 0 16 16"><polygon points="3,1 14,8 3,15" fill="currentColor"/></svg>
    Launch Autoresearch
  </button>
</div>

<div class="presets-section">
  <span class="presets-label">Quick Presets</span>
  <div class="presets-grid">
    {#each presets as p}
      <button class="preset-btn" on:click={() => usePreset(p.label)}>
        <span class="preset-name">{p.label}</span>
        <span class="preset-desc">{p.desc}</span>
      </button>
    {/each}
  </div>
</div>

<div class="info-bar">
  <div class="info-item"><span class="info-val">6</span><span class="info-lbl">Branches</span></div>
  <div class="info-item"><span class="info-val">50</span><span class="info-lbl">Iters/Branch</span></div>
  <div class="info-item"><span class="info-val">300</span><span class="info-lbl">Total Exp</span></div>
  <div class="info-item"><span class="info-val">~5m</span><span class="info-lbl">ETA</span></div>
</div>

<style>
  .ctx-icon { font-size: 14px; }
  .guide-section { padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }
  .guide-text { font: 400 11px/1.5 'SF Mono', monospace; color: #7f849c; margin: 0; }
  .input-group { display: flex; flex-direction: column; gap: 4px; }
  .input-label { font: 600 10px/1 'SF Mono', monospace; color: #89b4fa; text-transform: uppercase; letter-spacing: 0.04em; }
  .topic-input {
    font: 400 12px/1.5 'SF Mono', monospace;
    color: #cdd6f4; background: #313244;
    border: 1px solid #45475a; border-radius: 6px;
    padding: 10px 12px; resize: none; outline: none; transition: border-color 200ms;
  }
  .topic-input:focus { border-color: #89b4fa; }
  .topic-input::placeholder { color: #585b70; font-size: 11px; }
  .input-hint { font: 400 10px/1 'SF Mono', monospace; color: #585b70; text-align: right; }

  .action-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font: 600 12px/1 'SF Mono', monospace;
    padding: 8px 16px; border-radius: 6px;
    border: none; cursor: pointer; transition: all 200ms;
  }
  .action-btn.primary { background: #89b4fa; color: #1e1e2e; }
  .action-btn.primary:hover:not(:disabled) { background: #b4befe; }
  .action-btn.primary:disabled { opacity: 0.3; cursor: not-allowed; }
  .launch-btn { width: 100%; }

  .presets-section { padding: 0 14px 10px; display: flex; flex-direction: column; gap: 6px; }
  .presets-label { font: 600 9px/1 'SF Mono', monospace; color: #7f849c; text-transform: uppercase; letter-spacing: 0.06em; }
  .presets-grid { display: flex; flex-direction: column; gap: 4px; }
  .preset-btn {
    display: flex; flex-direction: column; gap: 2px;
    padding: 7px 10px; border-radius: 6px;
    border: 1px solid #313244; background: #181825;
    text-align: left; cursor: pointer; transition: all 150ms;
  }
  .preset-btn:hover { border-color: #89b4fa; background: rgba(137,180,250,0.05); }
  .preset-name { font: 600 11px/1 'SF Mono', monospace; color: #cdd6f4; }
  .preset-desc { font: 400 10px/1.2 'SF Mono', monospace; color: #585b70; }

  .info-bar { display: flex; gap: 0; padding: 0 14px 8px; margin-top: auto; border-top: 1px solid #313244; }
  .info-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; }
  .info-val { font: 800 13px/1 'SF Mono', monospace; color: #cdd6f4; font-variant-numeric: tabular-nums; }
  .info-lbl { font: 500 8px/1 'SF Mono', monospace; color: #585b70; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
