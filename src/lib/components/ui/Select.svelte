<script lang="ts">
  import type { Snippet } from 'svelte';

  export let value = '';
  export let disabled = false;
  export let children: Snippet | undefined = undefined;
</script>

<select
  {...$$restProps}
  bind:value
  {disabled}
  on:change
  class="select {$$props.class ?? ''}"
>
  {@render children?.()}
</select>

<style>
  /* Hallmark · component: select · genre: atmospheric · theme: Midnight
   * states: default · hover · focus · active · disabled · loading · error · success
   * contrast: pass (46–50)
   */
  .select {
    min-height: 2.75rem;
    padding-inline: var(--space-sm) var(--space-xl);
    border: var(--rule-thin) solid var(--color-rule-strong);
    border-radius: var(--radius-sm);
    background: var(--color-paper-2);
    color: var(--color-ink);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-transform: none;
  }

  .select:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .select:active {
    background: var(--color-paper-3);
  }

  .select:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (hover: hover) and (pointer: fine) {
    .select:hover { background: var(--color-paper-3); }
  }
</style>
