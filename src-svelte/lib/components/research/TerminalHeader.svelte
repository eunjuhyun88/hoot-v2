<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title: string = '';
  export let showExpand: boolean = false;
  export let extraClass: string = '';

  const dispatch = createEventDispatcher<{ expand: void }>();
</script>

<div class="ctx-header {extraClass}">
  <slot name="before" />
  <span class="ctx-title">{title}</span>
  <slot name="after" />
  {#if showExpand}
    <button class="ctx-expand-btn" type="button" aria-label="Expand" on:click|stopPropagation={() => dispatch('expand')}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3H3v4M13 3h4v4M17 13v4h-4M3 13v4h4" /></svg>
    </button>
  {/if}
</div>

<style>
  .ctx-header {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    background: #181825; border-bottom: 1px solid #313244;
    flex-shrink: 0;
  }
  .ctx-header::before {
    content: ''; width: 8px; height: 8px; border-radius: 50%;
    background: #f38ba8;
    box-shadow: 13px 0 0 #a6e3a1, 26px 0 0 #f9e2af;
    flex-shrink: 0;
  }
  .ctx-title {
    font: 700 11px/1 'SF Mono', 'Fira Code', monospace;
    color: #cdd6f4; letter-spacing: 0.02em;
  }
  .ctx-expand-btn {
    width: 24px; height: 24px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid #45475a; border-radius: 6px;
    background: #313244; color: #7f849c;
    cursor: pointer; transition: all 150ms; flex-shrink: 0;
    margin-left: auto;
  }
  .ctx-expand-btn:hover { background: #45475a; color: #89b4fa; border-color: #89b4fa; }
  .ctx-expand-btn svg {
    width: 12px; height: 12px;
    fill: none; stroke: currentColor; stroke-width: 1.8;
    stroke-linecap: round; stroke-linejoin: round;
  }
</style>
