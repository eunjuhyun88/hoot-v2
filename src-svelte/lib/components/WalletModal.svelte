<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { wallet, WALLET_OPTIONS } from '../stores/walletStore.ts';
  import { toasts } from '../stores/toastStore.ts';

  export let open = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  function selectWallet(name: string) {
    wallet.connect(name);
    toasts.success('Wallet Connected', `${name} has been connected`);
    dispatch('close');
  }

  function handleDisconnect() {
    wallet.disconnect();
    toasts.info('Wallet Disconnected', 'Your wallet has been disconnected');
    dispatch('close');
  }

  function close() {
    dispatch('close');
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-interactive-supports-focus -->
  <div class="wm-overlay" on:click|self={close} role="dialog" aria-modal="true" transition:fade={{ duration: 180 }}>
    <div class="wm-card" in:fly={{ y: 24, duration: 280 }}>
      <button class="wm-close" on:click={close}>×</button>

      {#if $wallet.connected}
        <!-- Connected state -->
        <div class="wm-header">
          <div class="wm-dot"></div>
          <span class="wm-status">Connected</span>
        </div>
        <div class="wm-connected-info">
          <span class="wm-wallet-name">{$wallet.name}</span>
          <span class="wm-address">{$wallet.address}</span>
        </div>
        <div class="wm-balance">
          <div class="wm-bal-row"><span class="wm-bal-label">HOOT</span><span class="wm-bal-value">1,247.50</span></div>
          <div class="wm-bal-row"><span class="wm-bal-label">ETH</span><span class="wm-bal-value">0.342</span></div>
          <div class="wm-bal-row"><span class="wm-bal-label">Credit</span><span class="wm-bal-value">85.0</span></div>
        </div>
        <button class="wm-btn wm-btn--disconnect" on:click={handleDisconnect}>Disconnect</button>

      {:else}
        <!-- Disconnected — wallet picker -->
        <h3 class="wm-title">Connect Wallet</h3>
        <p class="wm-sub">Choose a wallet to connect to the HOOT network</p>
        <div class="wm-options">
          {#each WALLET_OPTIONS as opt}
            <button class="wm-option" on:click={() => selectWallet(opt.name)}>
              <span class="wm-option-icon">{opt.icon}</span>
              <span class="wm-option-name">{opt.name}</span>
              <span class="wm-option-arrow">→</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .wm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: var(--z-modal, 300);
    padding: 24px;
  }

  .wm-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #E5E0DA);
    border-radius: var(--radius-lg, 16px);
    padding: 28px;
    max-width: 400px; width: 100%;
    position: relative;
    box-shadow: var(--shadow-lg);
    animation: scaleIn 300ms var(--ease-out-expo);
  }

  .wm-close {
    position: absolute; top: 14px; right: 14px;
    width: 28px; height: 28px; border: none;
    background: var(--page-bg, #FAF9F7);
    border-radius: 50%; font-size: 1.1rem;
    color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 150ms;
  }
  .wm-close:hover { background: var(--accent-subtle); color: var(--accent); }

  .wm-title {
    font-family: var(--font-display, serif);
    font-size: 1.2rem; font-weight: 700;
    color: var(--text-primary); margin: 0 0 4px;
  }

  .wm-sub {
    font-size: 0.74rem; color: var(--text-muted);
    margin: 0 0 20px; line-height: 1.4;
  }

  .wm-options { display: flex; flex-direction: column; gap: 8px; }

  .wm-option {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle, #EDEAE5);
    border-radius: var(--radius-md, 10px);
    cursor: pointer; transition: all 180ms;
    font-family: var(--font-body, sans-serif);
  }
  .wm-option:hover {
    border-color: var(--accent);
    background: var(--accent-subtle, rgba(217,119,87,0.12));
    transform: translateX(4px);
  }

  .wm-option-icon { font-size: 1.3rem; }
  .wm-option-name { flex: 1; font-size: 0.88rem; font-weight: 600; color: var(--text-primary); text-align: left; }
  .wm-option-arrow { font-size: 0.8rem; color: var(--text-muted); transition: color 150ms; }
  .wm-option:hover .wm-option-arrow { color: var(--accent); }

  /* Connected state */
  .wm-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
  }
  .wm-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green, #27864a);
    animation: breathe 2s infinite;
  }
  .wm-status {
    font-family: var(--font-mono, monospace);
    font-size: 0.68rem; font-weight: 700;
    color: var(--green); text-transform: uppercase; letter-spacing: 0.06em;
  }

  .wm-connected-info {
    display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;
  }
  .wm-wallet-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
  .wm-address {
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem; color: var(--text-muted);
  }

  .wm-balance {
    background: var(--page-bg, #FAF9F7);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md, 10px);
    padding: 12px 14px;
    display: flex; flex-direction: column; gap: 6px;
    margin-bottom: 16px;
  }
  .wm-bal-row { display: flex; justify-content: space-between; align-items: center; }
  .wm-bal-label {
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem; font-weight: 600;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;
  }
  .wm-bal-value {
    font-family: var(--font-mono, monospace);
    font-size: 0.82rem; font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .wm-btn {
    width: 100%; padding: 12px; border-radius: var(--radius-md, 10px);
    font-family: var(--font-body, sans-serif);
    font-size: 0.82rem; font-weight: 600;
    cursor: pointer; transition: all 150ms;
  }
  .wm-btn--disconnect {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
  }
  .wm-btn--disconnect:hover {
    border-color: var(--red, #c0392b);
    color: var(--red);
  }
</style>
