<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { selectedExperiment, clearSelection } from '../../stores/selectionStore.ts';
  import { resolveExperimentCategory, CATEGORY_COLORS, CATEGORY_LABELS } from '../../data/modifications.ts';
  import { humanizeModification } from '../../stores/jobStore.ts';
  import TerminalHeader from './TerminalHeader.svelte';

  export let bestMetric: number = Infinity;
  export let expandable = false;

  const dispatch = createEventDispatcher<{
    retrain: { code: string; parentId: number | null };
    fork: { parentId: number; text: string };
    expand: void;
  }>();

  let forkText = '';
  let showCodeEditor = false;
  let codeEditorContent = '';

  $: exp = $selectedExperiment;
  $: category = exp ? resolveExperimentCategory(exp.modification) : null;
  $: isNewBest = exp && exp.status === 'keep' && exp.metric === bestMetric && bestMetric < Infinity;

  function generateCodeSnippet(modification: string, metric: number): string {
    const cat = resolveExperimentCategory(modification);
    const lines = [
      `# train.py — AI-generated configuration`,
      `# Modification: ${modification}`,
      `# Category: ${CATEGORY_LABELS[cat] ?? cat}`,
      `# Result: val_bpb = ${metric > 0 ? metric.toFixed(4) : 'pending'}`,
      ``,
    ];
    switch (cat) {
      case 'learning_rate':
        lines.push(`learning_rate = ${(0.0001 + Math.random() * 0.005).toFixed(6)}`);
        lines.push(`lr_scheduler = "cosine_warmup"`);
        lines.push(`warmup_steps = ${Math.floor(100 + Math.random() * 400)}`);
        break;
      case 'batch_size':
        lines.push(`batch_size = ${[16, 32, 64, 128][Math.floor(Math.random() * 4)]}`);
        lines.push(`gradient_accumulation = ${[1, 2, 4][Math.floor(Math.random() * 3)]}`);
        break;
      case 'architecture':
        lines.push(`n_layers = ${Math.floor(4 + Math.random() * 12)}`);
        lines.push(`n_heads = ${[4, 8, 12, 16][Math.floor(Math.random() * 4)]}`);
        lines.push(`d_model = ${[256, 384, 512, 768][Math.floor(Math.random() * 4)]}`);
        break;
      case 'optimizer':
        lines.push(`optimizer = "${['adamw', 'lion', 'sophia', 'sgd'][Math.floor(Math.random() * 4)]}"`);
        lines.push(`weight_decay = ${(0.001 + Math.random() * 0.1).toFixed(4)}`);
        break;
      case 'regularization':
        lines.push(`dropout = ${(0.05 + Math.random() * 0.3).toFixed(2)}`);
        lines.push(`label_smoothing = ${(0.01 + Math.random() * 0.15).toFixed(3)}`);
        break;
      default:
        lines.push(`# ${modification}`);
        lines.push(`config = { "type": "${cat}" }`);
    }
    lines.push('');
    lines.push('# Edit below to guide the next training run');
    return lines.join('\n');
  }

  function openCodeEditor(modification: string, metric: number) {
    codeEditorContent = generateCodeSnippet(modification, metric);
    showCodeEditor = true;
  }

  function handleRetrain(parentId: number | null) {
    dispatch('retrain', { code: codeEditorContent, parentId });
    showCodeEditor = false;
  }

  function handleFork() {
    if (!forkText.trim() || !exp) return;
    dispatch('fork', { parentId: exp.id, text: forkText.trim() });
    forkText = '';
  }

  function handleForkKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleFork();
  }
</script>

{#if exp}
  <TerminalHeader title="Experiment #{exp.id}" showExpand={expandable} on:expand>
    <button slot="before" class="back-btn" type="button" aria-label="Back to research overview" on:click={clearSelection}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    </button>
    <span slot="after">
      {#if isNewBest}<span class="best-tag">&starf; Best</span>{/if}
    </span>
  </TerminalHeader>

  <div class="detail-grid">
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value" class:crash={exp.status === 'crash'} class:keep={exp.status === 'keep'}>
        {#if exp.status === 'crash'}<span class="status-dot crash"></span>CRASH
        {:else if exp.status === 'keep'}<span class="status-dot keep"></span>KEEP
        {:else}<span class="status-dot discard"></span>{exp.status}{/if}
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Category</span>
      <span class="detail-value cat-val" style="color: {CATEGORY_COLORS[category ?? 'hyperparameter_tuning']}">
        {CATEGORY_LABELS[category ?? 'hyperparameter_tuning'] ?? '?'}
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Metric</span>
      <span class="detail-value metric-val">
        {#if exp.status === 'crash'}<span class="crash">&mdash;</span>
        {:else}{exp.metric.toFixed(4)}
          {#if exp.delta !== 0}<span class="delta" class:positive={exp.delta > 0}>{exp.delta > 0 ? '\u25BC' : '\u25B2'}{Math.abs(exp.delta).toFixed(4)}</span>{/if}
        {/if}
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Modification</span>
      <span class="detail-value mod-val">{humanizeModification(exp.modification)}</span>
    </div>
    <div class="detail-row compact">
      <div class="detail-mini"><span class="detail-label">Node</span><span class="detail-value">{exp.nodeId}</span></div>
      <div class="detail-mini"><span class="detail-label">GPU</span><span class="detail-value">{exp.tier}x</span></div>
      <div class="detail-mini"><span class="detail-label">Time</span><span class="detail-value">{exp.duration}s</span></div>
    </div>
  </div>

  <div class="code-section">
    <div class="code-header">
      <span class="code-title">train.py</span>
      <span class="code-hint">AI-generated config</span>
      {#if !showCodeEditor}
        <button class="code-toggle" on:click={() => openCodeEditor(exp.modification, exp.metric)}>View Code</button>
      {:else}
        <button class="code-toggle" on:click={() => { showCodeEditor = false; }}>Hide</button>
      {/if}
    </div>
    {#if showCodeEditor}
      <textarea class="code-editor" bind:value={codeEditorContent} spellcheck="false" rows="12"></textarea>
      <div class="code-actions">
        <button class="action-btn retrain" on:click={() => handleRetrain(exp.id)}>Retrain with Edits</button>
      </div>
    {/if}
  </div>

  <div class="fork-section">
    <span class="fork-label">Or describe a modification</span>
    <textarea class="fork-input" bind:value={forkText} placeholder="Describe a modification to try..." on:keydown={handleForkKeydown} rows="2"></textarea>
    <button class="action-btn primary" on:click={handleFork} disabled={!forkText.trim()}>Fork & Submit</button>
  </div>
{/if}

<style>
  /* -- Back button & best tag -- */
  .back-btn {
    display: flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border: none; border-radius: 6px;
    background: #313244; color: #7f849c; cursor: pointer; transition: all 150ms;
  }
  .back-btn:hover { background: #45475a; color: #cdd6f4; }
  .best-tag {
    font: 700 9px/1 'SF Mono', monospace;
    color: #f9e2af; background: rgba(249,226,175,0.1);
    padding: 2px 6px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.03em;
  }

  /* -- Detail grid -- */
  .detail-grid { display: flex; flex-direction: column; padding: 10px 14px; gap: 6px; }
  .detail-row { display: flex; align-items: baseline; gap: 8px; }
  .detail-row.compact { display: flex; gap: 12px; margin-top: 4px; padding-top: 6px; border-top: 1px solid #313244; }
  .detail-mini { display: flex; flex-direction: column; gap: 2px; }
  .detail-label {
    font: 500 10px/1 'SF Mono', monospace;
    color: #7f849c; text-transform: uppercase;
    letter-spacing: 0.04em; min-width: 70px; flex-shrink: 0;
  }
  .detail-value { font: 600 12px/1.3 'SF Mono', monospace; color: #cdd6f4; }
  .detail-value.crash { color: #f38ba8; }
  .detail-value.keep { color: #a6e3a1; }
  .cat-val { font-weight: 700; font-size: 11px; text-transform: uppercase; }
  .metric-val { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; font-weight: 800; }
  .mod-val { font-weight: 400; color: #a6adc8; font-size: 11px; }
  .status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .status-dot.crash { background: #f38ba8; }
  .status-dot.keep { background: #a6e3a1; }
  .status-dot.discard { background: #585b70; }
  .delta { font: 500 10px/1 'SF Mono', monospace; color: #7f849c; margin-left: 4px; }
  .delta.positive { color: #a6e3a1; }

  /* -- Code section & editor -- */
  .code-section { padding: 8px 14px; border-top: 1px solid #313244; display: flex; flex-direction: column; gap: 4px; }
  .code-header { display: flex; align-items: center; gap: 6px; }
  .code-title { font: 700 10px/1 'SF Mono', monospace; color: #89b4fa; }
  .code-hint { font: 400 9px/1 'SF Mono', monospace; color: #585b70; flex: 1; }
  .code-toggle {
    font: 600 9px/1 'SF Mono', monospace;
    color: #fab387; background: rgba(250,179,135,0.1);
    border: none; border-radius: 4px;
    padding: 3px 8px; cursor: pointer; transition: all 150ms;
  }
  .code-toggle:hover { background: rgba(250,179,135,0.2); }
  .code-editor {
    font: 400 11px/1.5 'SF Mono', 'Fira Code', monospace;
    color: #a6e3a1; background: #11111b;
    border: 1px solid #313244; border-radius: 6px;
    padding: 8px 10px; resize: vertical;
    outline: none; tab-size: 2; transition: border-color 200ms;
  }
  .code-editor:focus { border-color: #89b4fa; }
  .code-actions { display: flex; align-items: center; gap: 8px; }
  .action-btn.retrain {
    background: #a6e3a1; color: #1e1e2e;
    padding: 7px 14px; border-radius: 6px;
    font: 600 11px/1 'SF Mono', monospace;
    border: none; cursor: pointer; transition: background 150ms;
  }
  .action-btn.retrain:hover { background: #94e2d5; }

  /* -- Fork section -- */
  .fork-section { margin-top: auto; padding: 10px 14px; border-top: 1px solid #313244; display: flex; flex-direction: column; gap: 6px; }
  .fork-label { font: 600 10px/1 'SF Mono', monospace; color: #7f849c; text-transform: uppercase; letter-spacing: 0.04em; }
  .fork-input {
    font: 400 12px/1.5 'SF Mono', monospace;
    color: #cdd6f4; background: #313244;
    border: 1px solid #45475a; border-radius: 6px;
    padding: 8px 10px; resize: none; outline: none; transition: border-color 200ms;
  }
  .fork-input:focus { border-color: #89b4fa; }
  .fork-input::placeholder { color: #585b70; }

  /* -- Action buttons -- */
  .action-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font: 600 12px/1 'SF Mono', monospace;
    padding: 8px 16px; border-radius: 6px;
    border: none; cursor: pointer; transition: all 200ms;
  }
  .action-btn.primary { background: #89b4fa; color: #1e1e2e; }
  .action-btn.primary:hover:not(:disabled) { background: #b4befe; }
  .action-btn.primary:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
