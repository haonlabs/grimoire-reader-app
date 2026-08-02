<script lang="ts">
  export let value = '';
  export let items: Array<{ value: string; label: string }> = [];
</script>

<div class="tabs" aria-label={$$restProps['aria-label'] ?? 'Tabs'}>
  {#each items as item}
    <button
      class:tabs__trigger--active={value === item.value}
      class="tabs__trigger"
      type="button"
      aria-pressed={value === item.value}
      on:click={() => (value = item.value)}
    >
      {item.label}
    </button>
  {/each}
</div>

<style>
  /* Hallmark · component: tabs · genre: atmospheric · theme: Midnight
   * states: default · hover · focus · active · disabled · loading · error · success
   * contrast: pass (46–50)
   */
  .tabs {
    display: flex;
    max-width: 100%;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
  }

  .tabs__trigger {
    min-height: 2.75rem;
    padding-inline: var(--space-sm);
    border: var(--rule-thin) solid transparent;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-muted);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .tabs__trigger--active {
    border-color: var(--color-rule-strong);
    background: var(--color-paper-2);
    color: var(--color-ink);
  }

  .tabs__trigger:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .tabs__trigger:active { transform: translateY(1px); }

  .tabs__trigger:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (hover: hover) and (pointer: fine) {
    .tabs__trigger:hover { color: var(--color-ink); }
  }

  @media (prefers-reduced-motion: reduce) {
    .tabs__trigger:active { transform: none; }
  }
</style>
