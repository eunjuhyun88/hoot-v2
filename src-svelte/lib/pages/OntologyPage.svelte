<script lang="ts">
  import { router } from "../stores/router.ts";
  import { jobStore } from "../stores/jobStore.ts";
  import {
    type ResearchOntology,
    type OntologyBranch,
    type BranchTypeId,
    type BranchTypeDefinition,
    BRANCH_CATALOG,
    ONTOLOGY_PRESETS,
    getBranchType,
    createEmptyOntology,
    createOntologyFromPreset,
    getEnabledBranches,
    getTotalExperiments,
    estimateBudgetHoot,
  } from "../data/ontologyData.ts";
  import OntologyBranchCard from "../components/OntologyBranchCard.svelte";

  // ─── State ───────────────────────────────────────
  let ontology: ResearchOntology = createEmptyOntology();
  let launching = false;
  let expandedBranch: BranchTypeId | null = null;

  // CSV upload state
  let csvFile: File | null = null;
  let csvPreviewRows: string[][] = [];
  let csvPreviewCols: string[] = [];
  let csvTotalRows = 0;
  let dragOver = false;

  // ─── Derived ─────────────────────────────────────
  $: enabledBranches = getEnabledBranches(ontology);
  $: totalExperiments = getTotalExperiments(ontology);
  $: estimatedBudget = estimateBudgetHoot(ontology);
  $: nameValid = ontology.name.trim().length >= 3;
  $: canLaunch = nameValid && enabledBranches.length > 0 && !launching;

  // ─── Preset ──────────────────────────────────────
  function applyPreset(presetId: string) {
    ontology = createOntologyFromPreset(presetId);
  }

  // ─── Branch helpers ──────────────────────────────
  function toggleBranch(type: BranchTypeId) {
    ontology.branches = ontology.branches.map(b =>
      b.type === type ? { ...b, enabled: !b.enabled } : b
    );
  }

  function updateBranchIters(type: BranchTypeId, val: number) {
    ontology.branches = ontology.branches.map(b =>
      b.type === type ? { ...b, iters: Math.max(1, Math.min(200, val)) } : b
    );
  }

  function toggleBranchExpand(type: BranchTypeId) {
    expandedBranch = expandedBranch === type ? null : type;
  }

  function toggleModel(branchType: BranchTypeId, modelId: string) {
    ontology.branches = ontology.branches.map(b => {
      if (b.type !== branchType) return b;
      const selected = b.selectedModels ?? [];
      const next = selected.includes(modelId)
        ? selected.filter(m => m !== modelId)
        : [...selected, modelId];
      return { ...b, selectedModels: next };
    });
  }

  function toggleCategory(branchType: BranchTypeId, catId: string) {
    ontology.branches = ontology.branches.map(b => {
      if (b.type !== branchType) return b;
      const selected = b.selectedCategories ?? [];
      const next = selected.includes(catId)
        ? selected.filter(c => c !== catId)
        : [...selected, catId];
      return { ...b, selectedCategories: next };
    });
  }

  function toggleArrayItem(branchType: BranchTypeId, field: 'selectedStrategies' | 'selectedMethods' | 'selectedTransforms', item: string) {
    ontology.branches = ontology.branches.map(b => {
      if (b.type !== branchType) return b;
      const selected = (b[field] as string[] | undefined) ?? [];
      const next = selected.includes(item)
        ? selected.filter(s => s !== item)
        : [...selected, item];
      return { ...b, [field]: next };
    });
  }

  // ─── CSV Upload ──────────────────────────────────
  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.csv')) processCSV(file);
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processCSV(file);
  }

  function processCSV(file: File) {
    csvFile = file;
    ontology.data = { ...ontology.data, source: 'csv' };
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      csvTotalRows = lines.length - 1;
      csvPreviewCols = lines[0]?.split(',').map(c => c.trim()) ?? [];
      csvPreviewRows = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim()));
    };
    reader.readAsText(file.slice(0, 1024 * 50));
  }

  function clearCSV() {
    csvFile = null;
    csvPreviewRows = [];
    csvPreviewCols = [];
    csvTotalRows = 0;
    ontology.data = { ...ontology.data, source: 'auto' };
  }

  // ─── Launch ──────────────────────────────────────
  function handleLaunch() {
    if (!canLaunch) return;
    launching = true;
    const branchCount = enabledBranches.length;
    const avgIters = Math.round(totalExperiments / branchCount);
    jobStore.startJob(ontology.name.trim(), branchCount, avgIters);
    setTimeout(() => {
      router.navigate("research", { topic: ontology.name.trim() });
    }, 600);
  }

  // ─── Branch config panel helpers ─────────────────
  function getBranchDef(type: BranchTypeId): BranchTypeDefinition | undefined {
    return getBranchType(type);
  }

  function getBranch(type: BranchTypeId): OntologyBranch | undefined {
    return ontology.branches.find(b => b.type === type);
  }
</script>

<div class="ontology-page">
  <!-- Header Bar -->
  <div class="header-bar">
    <button class="back-btn" on:click={() => router.navigate('dashboard')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="header-title">
      <h1>Research Ontology</h1>
      {#if ontology.forkedFrom}
        <span class="fork-badge">forked from {ontology.forkedFrom.name}</span>
      {/if}
    </div>
  </div>

  <!-- Scrollable Content -->
  <div class="scroll-body">
    <div class="scroll-inner">

      <!-- Presets -->
      <div class="preset-row">
        <span class="preset-label">Presets</span>
        <div class="preset-chips">
          {#each ONTOLOGY_PRESETS as preset}
            <button
              class="preset-chip"
              class:active={ontology.name === preset.name}
              on:click={() => applyPreset(preset.id)}
            >{preset.label}</button>
          {/each}
        </div>
      </div>

      <!-- ═══ SECTION: Overview ═══ -->
      <section class="section">
        <div class="section-header">
          <span class="section-icon">&#9673;</span>
          <span class="section-title">Overview</span>
          <span class="section-hint">Define your research job</span>
        </div>
        <div class="section-body">
          <div class="form-group">
            <label class="form-label" for="ont-name">Research Name</label>
            <input
              id="ont-name"
              type="text"
              class="form-input"
              class:invalid={ontology.name.length > 0 && !nameValid}
              placeholder="e.g., Crypto Market Prediction"
              bind:value={ontology.name}
            />
            {#if ontology.name.length > 0 && !nameValid}
              <span class="form-hint error">Minimum 3 characters</span>
            {/if}
          </div>
          <div class="form-group">
            <label class="form-label" for="ont-desc">Description</label>
            <textarea
              id="ont-desc"
              class="form-textarea"
              placeholder="What are you trying to predict or classify?"
              bind:value={ontology.description}
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tags</label>
            <input
              type="text"
              class="form-input mono"
              placeholder="crypto, market, prediction (comma separated)"
              value={ontology.tags.join(', ')}
              on:change={(e) => {
                ontology.tags = e.currentTarget.value.split(',').map(t => t.trim()).filter(Boolean);
              }}
            />
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-value">{enabledBranches.length}</span>
              <span class="stat-label">Branches</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{totalExperiments}</span>
              <span class="stat-label">Experiments</span>
            </div>
            <div class="stat-card">
              <span class="stat-value accent">~{estimatedBudget}</span>
              <span class="stat-label">HOOT est.</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{ontology.evaluation.metric}</span>
              <span class="stat-label">Metric</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ SECTION: Branches ═══ -->
      <section class="section">
        <div class="section-header">
          <span class="section-icon">&#8862;</span>
          <span class="section-title">Branch Strategy</span>
          <span class="section-hint">{enabledBranches.length}/{BRANCH_CATALOG.length} active</span>
        </div>
        <div class="section-body branches-list">
          {#each BRANCH_CATALOG as def}
            {@const branch = getBranch(def.id)}
            {#if branch}
              <OntologyBranchCard
                {def}
                {branch}
                expanded={expandedBranch === def.id}
                on:toggle={(e) => toggleBranch(e.detail)}
                on:expand={(e) => toggleBranchExpand(e.detail)}
                on:updateIters={(e) => updateBranchIters(e.detail.type, e.detail.value)}
                on:toggleModel={(e) => toggleModel(e.detail.branchType, e.detail.modelId)}
                on:toggleCategory={(e) => toggleCategory(e.detail.branchType, e.detail.catId)}
                on:toggleArrayItem={(e) => toggleArrayItem(e.detail.branchType, e.detail.field, e.detail.item)}
                on:updateOptimizer={(e) => {
                  ontology.branches = ontology.branches.map(b =>
                    b.type === e.detail.branchType ? { ...b, selectedOptimizer: e.detail.optimizer } : b
                  );
                }}
              />
            {/if}
          {/each}
        </div>
      </section>

      <!-- ═══ SECTION: Data ═══ -->
      <section class="section">
        <div class="section-header">
          <span class="section-icon">&#9636;</span>
          <span class="section-title">Dataset</span>
          <span class="section-hint">Configure data source</span>
        </div>
        <div class="section-body">
          <div class="source-tabs">
            <button class="source-tab" class:active={ontology.data.source === 'auto'} on:click={() => ontology.data = {...ontology.data, source: 'auto'}}>
              LLM Auto
            </button>
            <button class="source-tab" class:active={ontology.data.source === 'csv'} on:click={() => ontology.data = {...ontology.data, source: 'csv'}}>
              Upload CSV
            </button>
            <button class="source-tab" class:active={ontology.data.source === 'instructions'} on:click={() => ontology.data = {...ontology.data, source: 'instructions'}}>
              Instructions
            </button>
          </div>

          {#if ontology.data.source === 'auto'}
            <div class="info-box">
              The LLM will analyze your topic and automatically collect/generate an appropriate dataset using web APIs and data pipelines.
            </div>

          {:else if ontology.data.source === 'csv'}
            {#if csvFile}
              <div class="csv-loaded">
                <div class="csv-meta">
                  <span class="csv-name">{csvFile.name}</span>
                  <span class="csv-size">{(csvFile.size / 1024).toFixed(1)} KB · {csvTotalRows} rows · {csvPreviewCols.length} cols</span>
                  <button class="csv-clear" on:click={clearCSV}>Remove</button>
                </div>
                {#if csvPreviewCols.length > 0}
                  <div class="csv-preview">
                    <table>
                      <thead><tr>{#each csvPreviewCols as col}<th>{col}</th>{/each}</tr></thead>
                      <tbody>
                        {#each csvPreviewRows as row}
                          <tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </div>
            {:else}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="upload-zone"
                class:drag-over={dragOver}
                on:dragover|preventDefault={() => dragOver = true}
                on:dragleave={() => dragOver = false}
                on:drop={handleFileDrop}
                on:click={() => document.getElementById('csv-input')?.click()}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="upload-main">Drop CSV here or click to browse</span>
                <span class="upload-sub">Max 50 MB · UTF-8 · comma-separated</span>
              </div>
              <input id="csv-input" type="file" accept=".csv" style="display:none" on:change={handleFileSelect} />
            {/if}

          {:else}
            <div class="form-group">
              <label class="form-label" for="data-instructions">Data Generation Instructions</label>
              <textarea
                id="data-instructions"
                class="form-textarea code"
                placeholder="e.g., Fetch ETH price data from CoinGecko for the last 2 years, calculate 7/14/30 day moving averages, RSI, MACD..."
                bind:value={ontology.data.instructions}
                rows="8"
              ></textarea>
            </div>
          {/if}
        </div>
      </section>

      <!-- ═══ SECTION: Eval ═══ -->
      <section class="section">
        <div class="section-header">
          <span class="section-icon">&#9672;</span>
          <span class="section-title">Evaluation</span>
          <span class="section-hint">Metric, target & validation</span>
        </div>
        <div class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="eval-metric">Metric</label>
              <input id="eval-metric" type="text" class="form-input mono" bind:value={ontology.evaluation.metric} placeholder="bal_acc" />
            </div>
            <div class="form-group">
              <label class="form-label">Direction</label>
              <div class="toggle-group">
                <button class="toggle-btn" class:active={ontology.evaluation.direction === 'maximize'} on:click={() => ontology.evaluation.direction = 'maximize'}>maximize</button>
                <button class="toggle-btn" class:active={ontology.evaluation.direction === 'minimize'} on:click={() => ontology.evaluation.direction = 'minimize'}>minimize</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="form-label" for="eval-target">Target Threshold</label>
              <span class="label-value">{ontology.evaluation.target}</span>
            </div>
            <div class="slider-row">
              <input type="range" class="range-input" min="0" max="1" step="0.01" bind:value={ontology.evaluation.target} />
              <input id="eval-target" type="number" class="form-input small mono" min="0" max="1" step="0.01" bind:value={ontology.evaluation.target} />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Completion Mode</label>
            <div class="toggle-group wide">
              <button class="toggle-btn" class:active={ontology.evaluation.completionMode === 'target'} on:click={() => ontology.evaluation.completionMode = 'target'}>
                Target Metric
              </button>
              <button class="toggle-btn" class:active={ontology.evaluation.completionMode === 'all'} on:click={() => ontology.evaluation.completionMode = 'all'}>
                Run All Iters
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Validation Strategy</label>
            <div class="toggle-group wide">
              {#each ['holdout', 'kfold', 'purged_cv', 'stratified_kfold'] as vs}
                <button class="toggle-btn" class:active={ontology.evaluation.validationStrategy === vs} on:click={() => ontology.evaluation.validationStrategy = vs}>{vs.replace('_', ' ')}</button>
              {/each}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="eval-script">Custom Eval Script <span class="optional-tag">optional</span></label>
            <textarea
              id="eval-script"
              class="form-textarea code"
              placeholder={"# Python eval script\ndef evaluate(y_true, y_pred):\n    ..."}
              bind:value={ontology.evaluation.customEvalScript}
              rows="6"
            ></textarea>
          </div>
        </div>
      </section>

      <!-- ═══ SECTION: Config ═══ -->
      <section class="section">
        <div class="section-header">
          <span class="section-icon">&#9881;</span>
          <span class="section-title">Resources & Config</span>
          <span class="section-hint">GPU, budget, reproducibility</span>
        </div>
        <div class="section-body">
          <div class="form-group">
            <label class="form-label">GPU Tier</label>
            <div class="toggle-group">
              <button class="toggle-btn" class:active={ontology.resources.gpuTier === 1} on:click={() => ontology.resources.gpuTier = 1}>Tier 1</button>
              <button class="toggle-btn" class:active={ontology.resources.gpuTier === 2} on:click={() => ontology.resources.gpuTier = 2}>Tier 2</button>
              <button class="toggle-btn" class:active={ontology.resources.gpuTier === 3} on:click={() => ontology.resources.gpuTier = 3}>Tier 3</button>
            </div>
            <span class="form-hint">Tier 1: A10G · Tier 2: A100 · Tier 3: H100</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="cfg-budget">Budget (HOOT)</label>
              <input id="cfg-budget" type="number" class="form-input mono" placeholder="Auto" bind:value={ontology.resources.budgetHoot} />
            </div>
            <div class="form-group">
              <label class="form-label" for="cfg-time">Max Time (min)</label>
              <input id="cfg-time" type="number" class="form-input mono" placeholder="No limit" bind:value={ontology.resources.maxTimeMinutes} />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="cfg-seed">Training Seed</label>
              <input id="cfg-seed" type="number" class="form-input mono" placeholder="Random" bind:value={ontology.resources.trainingSeed} />
            </div>
            <div class="form-group">
              <label class="form-label">Deterministic</label>
              <button
                class="toggle-single"
                class:on={ontology.resources.deterministic}
                on:click={() => ontology.resources.deterministic = !ontology.resources.deterministic}
              >
                {ontology.resources.deterministic ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Visibility</label>
            <div class="toggle-group">
              <button class="toggle-btn" class:active={ontology.visibility === 'private'} on:click={() => ontology.visibility = 'private'}>Private</button>
              <button class="toggle-btn" class:active={ontology.visibility === 'public'} on:click={() => ontology.visibility = 'public'}>Public</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Bottom spacer for launch bar -->
      <div class="bottom-spacer"></div>
    </div>
  </div>

  <!-- Sticky Launch Bar -->
  <div class="launch-bar">
    <div class="launch-stats">
      <span class="launch-stat">
        <span class="stat-key">Branches</span>
        <span class="stat-val">{enabledBranches.length}</span>
      </span>
      <span class="launch-divider"></span>
      <span class="launch-stat">
        <span class="stat-key">Experiments</span>
        <span class="stat-val">{totalExperiments}</span>
      </span>
      <span class="launch-divider"></span>
      <span class="launch-stat">
        <span class="stat-key">Budget</span>
        <span class="stat-val accent">~{estimatedBudget} HOOT</span>
      </span>
      <span class="launch-divider"></span>
      <span class="launch-stat">
        <span class="stat-key">Target</span>
        <span class="stat-val">{ontology.evaluation.metric} {ontology.evaluation.direction === 'maximize' ? '≥' : '≤'} {ontology.evaluation.target}</span>
      </span>
    </div>
    <button
      class="launch-btn"
      class:launching
      disabled={!canLaunch}
      on:click={handleLaunch}
    >
      {#if launching}
        <span class="spinner"></span>
        Launching...
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
        Launch Research
      {/if}
    </button>
  </div>
</div>

<style>
  /* ═══ Root ═══ */
  .ontology-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 50px);
    overflow: hidden;
    background: var(--bg, #FAF8F5);
  }

  /* ═══ Header Bar ═══ */
  .header-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    flex-shrink: 0;
  }
  .back-btn {
    appearance: none;
    border: none;
    background: none;
    padding: 6px;
    cursor: pointer;
    color: var(--text-muted, #9a9590);
    display: flex;
    border-radius: 4px;
  }
  .back-btn:hover { color: var(--accent, #D97757); background: rgba(217,119,87,0.06); }
  .header-title {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }
  .header-title h1 {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    margin: 0;
    white-space: nowrap;
  }
  .fork-badge {
    font-size: 0.66rem;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--accent, #D97757);
    background: rgba(217,119,87,0.08);
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .preset-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .preset-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.66rem;
    font-weight: 600;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .preset-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .preset-chip {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    padding: 5px 12px;
    border-radius: 14px;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-secondary, #6b6560);
    cursor: pointer;
    white-space: nowrap;
    transition: all 120ms;
  }
  .preset-chip:hover { border-color: var(--accent, #D97757); color: var(--accent, #D97757); }
  .preset-chip.active {
    background: var(--text-primary, #2D2D2D);
    color: #fff;
    border-color: var(--text-primary, #2D2D2D);
  }

  /* ═══ Scrollable Body ═══ */
  .scroll-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .scroll-inner {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 28px;
  }

  /* ═══ Section ═══ */
  .section {
    margin-bottom: 32px;
  }
  .section-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .section-icon {
    font-size: 1rem;
    color: var(--accent, #D97757);
    line-height: 1;
  }
  .section-title {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
    letter-spacing: 0.04em;
  }
  .section-hint {
    font-size: 0.68rem;
    color: var(--text-muted, #9a9590);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .section-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .bottom-spacer {
    height: 20px;
  }

  /* ═══ Form Elements ═══ */
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary, #6b6560);
  }
  .label-row { display: flex; justify-content: space-between; align-items: baseline; }
  .label-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    color: var(--accent, #D97757);
    font-weight: 700;
  }
  .form-input, .form-textarea {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 6px;
    font-size: 0.84rem;
    color: var(--text-primary, #2D2D2D);
    background: var(--surface, #fff);
    transition: border-color 120ms;
  }
  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--accent, #D97757);
    box-shadow: 0 0 0 2px rgba(217,119,87,0.08);
  }
  .form-input.invalid { border-color: var(--red, #c0392b); }
  .form-input.mono, .form-textarea.code, .mono {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.78rem;
  }
  .form-textarea { resize: vertical; }
  .form-textarea.code {
    line-height: 1.6;
    tab-size: 4;
  }
  .form-input.small { width: 80px; text-align: center; flex-shrink: 0; }
  .form-hint {
    font-size: 0.66rem;
    color: var(--text-muted, #9a9590);
  }
  .form-hint.error { color: var(--red, #c0392b); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .optional-tag {
    font-size: 0.6rem;
    color: var(--text-muted, #9a9590);
    font-weight: 400;
    font-style: italic;
  }

  /* ═══ Toggle Group ═══ */
  .toggle-group {
    display: flex;
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 6px;
    overflow: hidden;
  }
  .toggle-group.wide { width: 100%; }
  .toggle-btn {
    appearance: none;
    border: none;
    background: var(--surface, #fff);
    padding: 8px 14px;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-secondary, #6b6560);
    cursor: pointer;
    flex: 1;
    text-align: center;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    border-right: 1px solid var(--border, #E5E0DA);
    transition: all 120ms;
  }
  .toggle-btn:last-child { border-right: none; }
  .toggle-btn.active {
    background: var(--text-primary, #2D2D2D);
    color: #fff;
    font-weight: 600;
  }
  .toggle-single {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    padding: 8px 16px;
    border-radius: 6px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-muted, #9a9590);
    transition: all 120ms;
    width: fit-content;
  }
  .toggle-single.on {
    background: var(--text-primary, #2D2D2D);
    color: #fff;
    border-color: var(--text-primary, #2D2D2D);
  }

  /* ═══ Slider ═══ */
  .slider-row { display: flex; align-items: center; gap: 12px; }
  .range-input {
    flex: 1;
    -webkit-appearance: none;
    height: 3px;
    border-radius: 2px;
    background: var(--border, #E5E0DA);
    outline: none;
  }
  .range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: var(--text-primary, #2D2D2D);
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    cursor: pointer;
  }

  /* ═══ Stats Grid ═══ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .stat-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 8px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .stat-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary, #2D2D2D);
  }
  .stat-value.accent { color: var(--accent, #D97757); }
  .stat-label {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }

  /* ═══ Branch Cards ═══ */
  .branches-list { gap: 8px; }

  /* ═══ Data Section ═══ */
  .source-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .source-tab {
    appearance: none;
    border: 1px solid var(--border, #E5E0DA);
    background: var(--surface, #fff);
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-secondary, #6b6560);
    cursor: pointer;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    transition: all 120ms;
  }
  .source-tab:hover { border-color: var(--accent, #D97757); }
  .source-tab.active {
    background: var(--text-primary, #2D2D2D);
    color: #fff;
    border-color: var(--text-primary, #2D2D2D);
  }

  .info-box {
    padding: 14px 16px;
    background: rgba(217,119,87,0.04);
    border: 1px solid rgba(217,119,87,0.12);
    border-radius: 6px;
    font-size: 0.76rem;
    color: var(--text-secondary, #6b6560);
    line-height: 1.5;
  }

  .upload-zone {
    border: 2px dashed var(--border, #E5E0DA);
    border-radius: 10px;
    padding: 36px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted, #9a9590);
    cursor: pointer;
    transition: all 150ms;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: var(--accent, #D97757);
    background: rgba(217,119,87,0.03);
  }
  .upload-main { font-size: 0.82rem; color: var(--text-secondary, #6b6560); }
  .upload-sub { font-size: 0.66rem; color: var(--text-muted, #9a9590); }

  /* CSV Preview */
  .csv-loaded {
    border: 1px solid var(--border, #E5E0DA);
    border-radius: 8px;
    overflow: hidden;
  }
  .csv-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--surface, #fff);
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
  }
  .csv-name {
    font-weight: 600;
    font-size: 0.78rem;
    color: var(--text-primary, #2D2D2D);
  }
  .csv-size {
    font-size: 0.66rem;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--text-muted, #9a9590);
    flex: 1;
  }
  .csv-clear {
    appearance: none;
    border: none;
    background: none;
    font-size: 0.68rem;
    color: var(--red, #c0392b);
    cursor: pointer;
    font-weight: 600;
  }
  .csv-preview {
    overflow-x: auto;
  }
  .csv-preview table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68rem;
  }
  .csv-preview th, .csv-preview td {
    padding: 6px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border-subtle, #EDEAE5);
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .csv-preview th {
    background: var(--bg, #FAF8F5);
    font-weight: 600;
    color: var(--text-secondary, #6b6560);
  }
  .csv-preview td { color: var(--text-primary, #2D2D2D); }

  /* ═══ Launch Bar ═══ */
  .launch-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
    background: var(--surface, #fff);
    border-top: 1px solid var(--border, #E5E0DA);
    flex-shrink: 0;
  }
  .launch-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
  }
  .launch-stat {
    display: flex;
    align-items: baseline;
    gap: 5px;
    white-space: nowrap;
  }
  .stat-key {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--text-muted, #9a9590);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .stat-val {
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-primary, #2D2D2D);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
  }
  .stat-val.accent { color: var(--accent, #D97757); }
  .launch-divider {
    width: 1px;
    height: 16px;
    background: var(--border, #E5E0DA);
    flex-shrink: 0;
  }

  .launch-btn {
    appearance: none;
    border: none;
    padding: 10px 28px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--text-primary, #2D2D2D);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    transition: all 150ms;
    flex-shrink: 0;
  }
  .launch-btn:hover:not(:disabled) {
    background: var(--accent, #D97757);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(217,119,87,0.25);
  }
  .launch-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .launch-btn.launching {
    background: var(--accent, #D97757);
    cursor: wait;
    animation: lpulse 1s ease-in-out infinite;
  }
  @keyframes lpulse {
    0%, 100% { box-shadow: 0 0 12px rgba(217,119,87,0.2); }
    50% { box-shadow: 0 0 28px rgba(217,119,87,0.4); }
  }
  .spinner {
    display: inline-block;
    width: 12px; height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ═══ Responsive ═══ */
  @media (max-width: 768px) {
    .header-bar { padding: 8px 12px; }
    .back-btn { padding: 5px; }
    .header-title h1 { font-size: 0.95rem; }
    .scroll-inner { padding: 14px; }
    .preset-row {
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
      padding-bottom: 12px;
    }
    .preset-chips { gap: 5px; }
    .preset-chip {
      padding: 5px 10px;
      font-size: 0.68rem;
    }
    .section { margin-bottom: 24px; }
    .section-body { gap: 12px; }
    .form-row { grid-template-columns: 1fr; }
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .stat-card { padding: 12px 10px; }
    .launch-stats { gap: 8px; }
    .launch-stat { flex-direction: column; gap: 1px; }
    .launch-divider { display: none; }
  }
  @media (max-width: 480px) {
    .header-bar { padding: 8px 12px; }
    .scroll-inner { padding: 12px; }
    .launch-bar { padding: 8px 12px; flex-wrap: wrap; }
    .launch-btn { width: 100%; justify-content: center; }
  }
</style>
