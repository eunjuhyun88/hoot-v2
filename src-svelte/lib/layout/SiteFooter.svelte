<script lang="ts">
  const currentYear = new Date().getFullYear();
</script>

<footer class="site-footer">
  <span class="footer-left">&copy; {currentYear} Holo Studio Co., Ltd.</span>
  <span class="footer-center">HOOT Protocol</span>
  <span class="footer-right">
    <a href="https://hoot.holostudio.io" target="_blank" rel="noopener noreferrer">Whitepaper</a>
    <a href="https://x.com/HootBrowser" target="_blank" rel="noopener noreferrer">X</a>
  </span>
</footer>

<style>
  .site-footer {
    margin-top: auto;
    border-top: 1px solid var(--border-subtle, #EDEAE5);
    padding: 8px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.6rem;
    color: var(--text-muted, #9a9590);
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .footer-center {
    color: var(--accent, #D97757);
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .footer-right {
    display: flex;
    gap: 12px;
  }

  .footer-right a {
    color: var(--text-muted, #9a9590);
    text-decoration: none;
    transition: color 150ms ease;
  }

  .footer-right a:hover {
    color: var(--accent, #D97757);
  }

  @media (max-width: 600px) {
    .site-footer {
      padding: 6px 12px;
      font-size: 0.54rem;
    }
    .footer-left { display: none; }
  }
</style>
